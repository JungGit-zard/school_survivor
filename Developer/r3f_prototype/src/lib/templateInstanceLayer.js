import * as THREE from 'three'

// Studio 튜닝 템플릿 1벌 → InstancedMesh 층(2026-11-13, 오니기리에서 시작해 XP 교과서도 사용).
// 템플릿(보이지 않는 실제 모델 1벌, StudioTunedGroup 포함)의 메시마다 InstancedMesh 1개를 만들고,
// 지오메트리·재질은 템플릿 메시의 것을 그대로 참조한다(복제·대체 모델 없음). 템플릿 루트 기준 각 메시의
// 상대 행렬(Studio 루트·파츠 변형, 외곽선 두께 배율 포함)을 매 프레임 다시 읽고, Studio가 재질을 분리하거나
// 데칼 메시를 붙이면 그 변화도 따라간다. 인스턴스 행렬 = 물체 자세(P) × 상대 행렬.
// 그리기 호출: 물체 N개 × 템플릿 메시 M개 → M회.

const _zero = new THREE.Matrix4().makeScale(0, 0, 0)
const _m = new THREE.Matrix4()
const _base = new THREE.Matrix4()
const _q = new THREE.Quaternion()
const _s = new THREE.Vector3(1, 1, 1)

// object → root까지의 로컬 행렬 곱(= root 좌표계에서 본 object 행렬). root에 닿지 못하면 false.
export function relativeMatrixInto(out, object, root) {
  out.identity()
  let node = object
  while (node && node !== root) {
    if (node.matrixAutoUpdate) node.updateMatrix()
    out.premultiply(node.matrix)
    node = node.parent
  }
  return node === root
}

function isVisibleUnder(object, root) {
  for (let node = object; node && node !== root; node = node.parent) {
    if (!node.visible) return false
  }
  return true
}

// 이번에 실제로 그리는 앞부분(count개)만 GPU로 올린다(전체 용량을 매 프레임 올리지 않음).
export function markInstanceUpload(attribute, count, itemSize) {
  attribute.clearUpdateRanges()
  attribute.addUpdateRange(0, Math.max(0, count) * itemSize)
  attribute.needsUpdate = true
}

function createPartMesh(source, capacity) {
  const mesh = new THREE.InstancedMesh(source.geometry, source.material, capacity)
  mesh.frustumCulled = false
  mesh.count = 0
  mesh.matrixAutoUpdate = false
  mesh.renderOrder = source.renderOrder
  mesh.castShadow = source.castShadow
  mesh.receiveShadow = source.receiveShadow
  return mesh
}

export function createTemplateInstanceLayer(initialCapacity = 16, name = 'templateInstances') {
  const group = new THREE.Group()
  group.name = name
  let capacity = Math.max(1, Math.floor(initialCapacity))
  let used = new Uint8Array(capacity)
  let bases = new Float32Array(capacity * 16) // 슬롯별 주먹밥 자세 행렬(P)
  let highest = -1
  let live = 0 // 지금 주인이 있는 슬롯 수
  const parts = [] // { source, mesh, rel }
  const found = []
  let foundRoot = null
  const collect = (object) => {
    if (object !== foundRoot && object.isMesh && !object.isInstancedMesh) found.push(object)
  }

  function writeSlot(slot) {
    if (!used[slot]) {
      for (let k = 0; k < parts.length; k += 1) parts[k].mesh.setMatrixAt(slot, _zero)
      return
    }
    _base.fromArray(bases, slot * 16)
    for (let k = 0; k < parts.length; k += 1) {
      _m.multiplyMatrices(_base, parts[k].rel)
      parts[k].mesh.setMatrixAt(slot, _m)
    }
  }

  // 그리는 수·표시 여부·올릴 범위를 맞춘다. 그릴 것이 없으면 렌더 목록에서 빠지도록 숨기되,
  // 템플릿에서 Studio가 숨긴 파츠(baseVisible = false)는 계속 숨긴다.
  function flush() {
    const count = highest + 1
    for (let k = 0; k < parts.length; k += 1) {
      const part = parts[k]
      part.mesh.count = count
      part.mesh.visible = part.baseVisible && count > 0
      markInstanceUpload(part.mesh.instanceMatrix, count, 16)
    }
  }

  function applyVisibility() {
    const count = highest + 1
    for (let k = 0; k < parts.length; k += 1) parts[k].mesh.visible = parts[k].baseVisible && count > 0
  }

  function rewriteAll() {
    for (let slot = 0; slot <= highest; slot += 1) writeSlot(slot)
    flush()
  }

  function rebuildParts() {
    for (const part of parts) {
      group.remove(part.mesh)
      part.mesh.dispose() // 인스턴스 버퍼만 놓는다. 지오메트리·재질은 템플릿 소유라 건드리지 않는다.
    }
    parts.length = 0
    for (const source of found) {
      const mesh = createPartMesh(source, capacity)
      group.add(mesh)
      parts.push({ source, mesh, rel: new THREE.Matrix4(), baseVisible: true })
    }
  }

  // 용량만 키울 때: 파츠(원본 메시·상대 행렬·재질·표시 여부)는 그대로 두고 InstancedMesh만 큰 것으로 바꾼다.
  function resizeParts() {
    for (const part of parts) {
      const old = part.mesh
      const mesh = createPartMesh(part.source, capacity)
      mesh.material = old.material
      mesh.geometry = old.geometry
      group.remove(old)
      old.dispose()
      group.add(mesh)
      part.mesh = mesh
    }
  }

  return {
    group,
    get capacity() { return capacity },
    get count() { return highest + 1 },
    get liveSlots() { return live },
    get partCount() { return parts.length },
    get parts() { return parts },

    // 템플릿(보이지 않는 OnigiiriModel 1벌)을 읽어 파츠 목록·상대 행렬·재질·표시 여부를 맞춘다.
    // 매 프레임 불러도 할당이 없다(메시 목록이 바뀔 때만 InstancedMesh를 다시 만든다).
    syncTemplate(root) {
      if (!root || typeof root.traverse !== 'function') return parts.length
      found.length = 0
      foundRoot = root
      root.traverse(collect)
      foundRoot = null
      let changed = found.length !== parts.length
      for (let k = 0; !changed && k < found.length; k += 1) changed = parts[k].source !== found[k]
      if (changed) rebuildParts()
      let dirty = changed
      for (let k = 0; k < parts.length; k += 1) {
        const part = parts[k]
        const { source, mesh } = part
        if (mesh.material !== source.material) mesh.material = source.material
        if (mesh.geometry !== source.geometry) mesh.geometry = source.geometry
        mesh.renderOrder = source.renderOrder
        part.baseVisible = isVisibleUnder(source, root)
        _m.copy(part.rel)
        relativeMatrixInto(part.rel, source, root)
        if (!dirty && !_m.equals(part.rel)) dirty = true
      }
      if (dirty) rewriteAll()
      else applyVisibility() // 행렬이 그대로면 올리지 않고 표시 여부만
      return parts.length
    },

    claim() {
      let slot = -1
      for (let i = 0; i < capacity; i += 1) {
        if (!used[i]) { slot = i; break }
      }
      if (slot < 0) {
        // 꽉 차면 두 배로 늘린다(동시 주먹밥 수 상한 없음 — 2026-11-02 Terry).
        slot = capacity
        capacity *= 2
        const nextUsed = new Uint8Array(capacity)
        nextUsed.set(used)
        used = nextUsed
        const nextBases = new Float32Array(capacity * 16)
        nextBases.set(bases)
        bases = nextBases
        resizeParts()
        for (let i = 0; i <= highest; i += 1) writeSlot(i)
      }
      used[slot] = 1
      live += 1
      _zero.toArray(bases, slot * 16)
      if (slot > highest) highest = slot
      writeSlot(slot)
      flush()
      return slot
    },

    release(slot) {
      if (!(slot >= 0 && slot < capacity) || !used[slot]) return
      used[slot] = 0
      live -= 1
      writeSlot(slot)
      while (highest >= 0 && !used[highest]) highest -= 1
      flush()
    },

    // 물체 1개의 이번 프레임 자세(위치 + 오일러 회전 + 균일 축척, 기본 1)를 쓴다.
    // 예전에 그 물체를 감싸던 바깥 group(position·rotation·scale)과 같은 변환이다.
    write(slot, position, rotation, scale = 1) {
      if (!(slot >= 0 && slot < capacity) || !used[slot]) return
      _q.setFromEuler(rotation)
      _s.setScalar(scale)
      _base.compose(position, _q, _s)
      _base.toArray(bases, slot * 16)
      if (parts.length === 0) return
      writeSlot(slot)
      const count = highest + 1
      for (let k = 0; k < parts.length; k += 1) markInstanceUpload(parts[k].mesh.instanceMatrix, count, 16)
    },

    // GPU 인스턴스 버퍼만 놓는다(지오메트리·재질은 템플릿 소유). 객체는 그대로라 StrictMode 재마운트처럼
    // 같은 층을 다시 그려도 three가 버퍼를 다시 올린다.
    dispose() {
      for (const part of parts) part.mesh.dispose()
    },
  }
}
