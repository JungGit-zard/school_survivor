// 스튜디오 파츠 변형의 왕복 복원 보장 테스트.
// 요구 불변식: 어떤 튜닝을 거치든 원래 값(position 0 · rotation 0 · scale 1)을 다시 넣으면
// 부동소수점 오차 없이 최초 상태로 정확히 복귀해야 한다.
import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import {
  applySavedStudioPartTunings,
  applyStudioTuning,
  captureStudioPartBaseTransform,
  captureStudioPartBaseTransforms,
} from './StudioTunedGroup.jsx'

function buildTree() {
  const root = new THREE.Group()
  const inner = new THREE.Group()
  const head = new THREE.Group()
  head.position.set(0, 0.82, 0)
  const face = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial())
  const eyeL = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial())
  eyeL.position.set(-0.12, 0.04, 0.24)
  eyeL.scale.set(1, 1, 1)
  const eyeR = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial())
  eyeR.position.set(0.12, 0.04, 0.24)
  head.add(face, eyeL, eyeR)
  inner.add(head)
  root.add(inner)
  return { root, head, eyeR }
}

const snapshot = (o) => ({
  p: o.position.toArray(),
  r: [o.rotation.x, o.rotation.y, o.rotation.z],
  s: o.scale.toArray(),
})

const KEY = 'zombie-e01::part::0.0.2' // root→inner→head→eyeR

describe('스튜디오 파츠 왕복 복원 진단', () => {
  it('A. 튜닝 적용 후 기본값(0/0/1)으로 되돌리면 원래 상태로 복귀하는가', () => {
    const { root, eyeR } = buildTree()
    const before = snapshot(eyeR)

    applySavedStudioPartTunings(root, 'zombie-e01', {
      [KEY]: { positionX: 0.5, positionY: -0.2, rotationZ: 30, scale: 1.6 },
    }, { materialTuning: false })
    const moved = snapshot(eyeR)

    applySavedStudioPartTunings(root, 'zombie-e01', {
      [KEY]: { positionX: 0, positionY: 0, rotationZ: 0, scale: 1 },
    }, { materialTuning: false })
    const restored = snapshot(eyeR)

    console.log('A before  ', JSON.stringify(before))
    console.log('A moved   ', JSON.stringify(moved))
    console.log('A restored', JSON.stringify(restored))
    expect(restored).toEqual(before)
  })

  it('B. 튜닝을 아예 제거(키 삭제)해도 원래 상태로 복귀하는가', () => {
    const { root, eyeR } = buildTree()
    const before = snapshot(eyeR)
    applySavedStudioPartTunings(root, 'zombie-e01', { [KEY]: { positionX: 0.5, scale: 2 } }, { materialTuning: false })
    applySavedStudioPartTunings(root, 'zombie-e01', {}, { materialTuning: false })
    console.log('B restored', JSON.stringify(snapshot(eyeR)))
    expect(snapshot(eyeR)).toEqual(before)
  })

  it('C. 100회 무작위 튜닝을 거친 뒤 기본값을 넣으면 드리프트 없이 복귀하는가', () => {
    const { root, eyeR } = buildTree()
    const before = snapshot(eyeR)
    for (let i = 0; i < 100; i += 1) {
      applySavedStudioPartTunings(root, 'zombie-e01', {
        [KEY]: {
          positionX: Math.sin(i) * 2, positionY: Math.cos(i) * 2, positionZ: i * 0.01,
          rotationX: i * 7, rotationY: -i * 3, rotationZ: i * 11,
          scale: 1 + (i % 5) * 0.3, scaleX: 1 + (i % 3) * 0.2,
        },
      }, { materialTuning: false })
    }
    applySavedStudioPartTunings(root, 'zombie-e01', {
      [KEY]: { positionX: 0, positionY: 0, positionZ: 0, rotationX: 0, rotationY: 0, rotationZ: 0, scale: 1, scaleX: 1 },
    }, { materialTuning: false })
    console.log('C restored', JSON.stringify(snapshot(eyeR)))
    expect(snapshot(eyeR)).toEqual(before)
  })

  it('D-old. 마운트 캡처 없이 애니메이션 뒤 첫 튜닝이 들어오면 base가 오염된다 (예전 동작)', () => {
    const { root, eyeR } = buildTree()
    const rest = snapshot(eyeR)
    eyeR.position.y += 0.5 // 애니메이션이 움직여 놓은 상태
    applySavedStudioPartTunings(root, 'zombie-e01', { [KEY]: { positionX: 0.3 } }, { materialTuning: false })
    applySavedStudioPartTunings(root, 'zombie-e01', { [KEY]: { positionX: 0 } }, { materialTuning: false })
    // 이것이 사용자가 겪던 증상이다: 0을 넣어도 원래 자리가 아니다.
    expect(snapshot(eyeR)).not.toEqual(rest)
  })

  it('D-new. 마운트 시 base를 확정해두면 애니메이션 뒤에 튜닝해도 0으로 정확히 복귀한다', () => {
    const { root, eyeR } = buildTree()
    const rest = snapshot(eyeR)

    captureStudioPartBaseTransforms(root) // ← 마운트 시점(첫 프레임 이전) 1회

    eyeR.position.y += 0.5 // 그 뒤 애니메이션이 움직인다
    applySavedStudioPartTunings(root, 'zombie-e01', { [KEY]: { positionX: 0.3 } }, { materialTuning: false })
    applySavedStudioPartTunings(root, 'zombie-e01', { [KEY]: { positionX: 0 } }, { materialTuning: false })

    console.log('D-new rest    ', JSON.stringify(rest))
    console.log('D-new restored', JSON.stringify(snapshot(eyeR)))
    expect(snapshot(eyeR)).toEqual(rest)
  })

  it('E. 아웃라인 머티리얼 스케일과 파츠 스케일이 같은 오브젝트에서 충돌하는가', () => {
    const { root } = buildTree()
    const outline = new THREE.Mesh(
      new THREE.BoxGeometry(),
      new THREE.MeshBasicMaterial({ side: THREE.BackSide, stencilFunc: THREE.NotEqualStencilFunc }),
    )
    outline.scale.set(1.08, 1.08, 1.08)
    root.children[0].children[0].add(outline) // head의 4번째 자식
    const key = 'zombie-e01::part::0.0.3'
    const before = outline.scale.toArray()

    applySavedStudioPartTunings(root, 'zombie-e01', { [key]: { scale: 2 } }, { materialTuning: true })
    const moved = outline.scale.toArray()
    applySavedStudioPartTunings(root, 'zombie-e01', { [key]: { scale: 1 } }, { materialTuning: true })
    const restored = outline.scale.toArray()

    console.log('E before  ', JSON.stringify(before))
    console.log('E moved   ', JSON.stringify(moved))
    console.log('E restored', JSON.stringify(restored))
    expect(restored).toEqual(before)
  })
})
