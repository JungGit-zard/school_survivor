# ZombieE_01 Studio 기본 변형 연결 코드 원문

## 목적

이 문서는 `Zombie E01`이 Graphics Studio에서 파츠 선택, 위치·크기·회전 수치 입력, 저장, 미리보기 반영, 게임 반영에 사용하는 기본 연결 코드를 원문 그대로 보존한다.

기준 커밋: `88591bb`

핵심 규칙:

- `E01`의 Studio item ID는 `zombie-e01`이다.
- `E01` 파츠에는 `studioPartId`를 지정하지 않는다.
- 파츠 연결 키는 장면 트리의 자식 순서를 이어 붙인 숫자 경로다.
- 변형은 최초 `position`, `scale`, `rotation`을 base로 저장한 뒤 입력값을 더하거나 곱해서 적용한다.
- 원래 수치인 위치 `0`, 크기 `1`, 회전 `0`을 다시 입력하면 저장된 base로 돌아간다.

## 1. E01 Studio item ID

원본: `Developer/r3f_prototype/src/lib/graphicsStudioConfig.js`

```js
export function getStudioZombieItemId(type) {
  if (type === 'B02') return 'stage2-boss-v2'
  return type === 'B03' ? 'zombie-b03-pe-teacher' : `zombie-${String(type).toLowerCase()}`
}
```

## 2. 기본 변형 초기값

원본: `Developer/r3f_prototype/src/lib/graphicsStudioConfig.js`

```js
export const DEFAULT_STUDIO_TUNING = Object.freeze({
  scale: 1,
  scaleX: 1,
  scaleY: 1,
  scaleZ: 1,
  positionX: 0,
  positionY: 0,
  positionZ: 0,
  outlineThickness: 1,
  outlineOpacity: 0.96,
  outlineColor: '#050209',
  color: '#ffffff',
  colorStrength: 0,
  saturation: 1,
  brightness: 1,
  emissiveIntensity: 0.14,
  rotationX: 0,
  rotationY: 0,
  rotationZ: 0,
  animation: 'normal',
})
```

## 3. E01이 사용하는 ZBlock

원본: `Developer/r3f_prototype/src/components/ZombieMesh.jsx`

```jsx
function ZBlock({ name, studioPartId, size, position, rotation, color, emissive = 0.12, outlineScale = 1.08, flash = false, children = null }) {
  const geo    = getCachedBoxGeo(...size)
  const outMat = getSharedOutlineMat()
  const mat    = flash ? getFlashMat() : getCachedToonMat(color, emissive)
  const os     = inflateScale(outlineScale)
  return (
    <group name={studioPartId ?? name} userData={studioPartId ? { studioPartId } : undefined} position={position} rotation={rotation}>
      <mesh renderOrder={1} geometry={geo} material={outMat} scale={[os, os, os]} userData={{ studioRenderOutline: true }} raycast={disableRaycast} />
      <mesh renderOrder={2} geometry={geo} material={mat} />
      {children}
    </group>
  )
}
```

## 4. E01 모델과 StudioTunedGroup 연결

`type === 'E01'`은 별도 분기 없이 아래 기본 반환문을 사용한다. 아래 E01 파츠의 `ZBlock` 호출에는 `studioPartId`가 없다.

원본: `Developer/r3f_prototype/src/components/ZombieMesh.jsx`

```jsx
  return (
    <StudioTunedGroup itemId={getStudioZombieItemId(type)}>
      <group>
      {/* ── 머리 ── */}
      <group ref={reg('head')} position={[0, 0.82, 0]}>
        <ZBlock size={[0.52, 0.48, 0.46]} position={[0, 0, 0]}       color={pal.skin} emissive={0.08} outlineScale={1.08} flash={hitFlash} />
        {/* 눈 (빨갛게 빛남) */}
        <ZBlock size={[0.10, 0.09, 0.06]} position={[-0.12, 0.04, 0.24]} color={pal.eye} emissive={0.9} outlineScale={1.0} flash={hitFlash} />
        <ZBlock size={[0.10, 0.09, 0.06]} position={[ 0.12, 0.04, 0.24]} color={pal.eye} emissive={0.9} outlineScale={1.0} flash={hitFlash} />
      </group>

      {/* ── 몸통 ── */}
      <group ref={reg('body')} position={[0, 0.28, 0]}>
        <ZBlock size={[0.56, 0.58, 0.40]} position={[0, 0, 0]}       color={pal.body} emissive={0.14} outlineScale={1.09} flash={hitFlash} />
      </group>

      {/* ── 왼팔 (어깨 pivot, 앞으로 뻗음) ── */}
      <group ref={reg('armL')} position={[-0.40, 0.52, 0]} rotation={[-1.15, 0, 0.12]}>
        <ZBlock size={[0.20, 0.50, 0.20]} position={[0, -0.25, 0]}   color={pal.body} emissive={0.10} outlineScale={1.05} flash={hitFlash} />
        <ZBlock size={[0.18, 0.16, 0.18]} position={[0, -0.55, 0]}   color={pal.skin} emissive={0.07} outlineScale={1.03} flash={hitFlash} />
      </group>

      {/* ── 오른팔 (어깨 pivot, 앞으로 뻗음) ── */}
      <group ref={reg('armR')} position={[ 0.40, 0.52, 0]} rotation={[-1.15, 0, -0.12]}>
        <ZBlock size={[0.20, 0.50, 0.20]} position={[0, -0.25, 0]}   color={pal.body} emissive={0.10} outlineScale={1.05} flash={hitFlash} />
        <ZBlock size={[0.18, 0.16, 0.18]} position={[0, -0.55, 0]}   color={pal.skin} emissive={0.07} outlineScale={1.03} flash={hitFlash} />
      </group>

      {/* ── 왼다리 (힙 pivot, 신발 포함) ── */}
      <group ref={reg('legL')} position={[-0.15, 0.00, 0]}>
        <ZBlock size={[0.22, 0.52, 0.26]} position={[0, -0.26, 0]}   color={pal.body} emissive={0.10} outlineScale={1.06} flash={hitFlash} />
        <ZBlock size={[0.24, 0.12, 0.34]} position={[0, -0.57, 0.05]} color={0x1a1a1a} emissive={0.05} outlineScale={1.03} flash={hitFlash} />
      </group>

      {/* ── 오른다리 (힙 pivot, 신발 포함) ── */}
      <group ref={reg('legR')} position={[ 0.15, 0.00, 0]}>
        <ZBlock size={[0.22, 0.52, 0.26]} position={[0, -0.26, 0]}   color={pal.body} emissive={0.10} outlineScale={1.06} flash={hitFlash} />
        <ZBlock size={[0.24, 0.12, 0.34]} position={[0, -0.57, 0.05]} color={0x1a1a1a} emissive={0.05} outlineScale={1.03} flash={hitFlash} />
      </group>
      </group>
    </StudioTunedGroup>
  )
```

## 5. 더블클릭한 E01 파츠의 숫자 경로 생성

E01에는 `studioPartId`가 없으므로 `getStudioPartKey`에서 아래 숫자 경로 생성 부분이 실행된다.

원본: `Developer/r3f_prototype/src/components/GraphicsStudioPreview.jsx`

```js
  const path = []
  let current = object
  while (current && current !== root) {
    const parent = current.parent
    if (!parent) return null
    const index = parent.children.indexOf(current)
    if (index < 0) return null
    path.unshift(index)
    current = parent
  }

  return current === root ? path.join('.') : null
```

## 6. 숫자 경로로 E01 파츠 다시 찾기

Studio 미리보기에서 사용하는 원문:

원본: `Developer/r3f_prototype/src/components/GraphicsStudioPreview.jsx`

```js
  return key.split('.').reduce((node, index) => node?.children?.[Number(index)] ?? null, root)
```

게임 런타임에서 저장된 숫자 경로를 찾는 원문:

원본: `Developer/r3f_prototype/src/components/StudioTunedGroup.jsx`

```js
  const parts = key.split('.')

  for (let offset = 0; offset < parts.length; offset += 1) {
    const found = parts
      .slice(offset)
      .reduce((node, index) => node?.children?.[Number(index)] ?? null, root)
    if (found) return found
  }

  return null
```

## 7. 파츠 더블클릭 선택

원본: `Developer/r3f_prototype/src/components/GraphicsStudioPreview.jsx`

```js
  const handlePartDoubleClick = (event) => {
    const key = getStudioPartKey(rootRef.current, event.object)
    if (!key) return
    const part = findStudioPart(rootRef.current, key)
    event.stopPropagation()
    onPartFocus?.({
      key,
      label: getStudioPartLabel(part ?? event.object),
      additive: Boolean(event.shiftKey || event.nativeEvent?.shiftKey),
      faceAxis: getDoubleClickFaceAxis(event, part ?? event.object),
    })
  }
```

```jsx
      <group ref={rootRef} scale={transform.scale} position={transform.position} rotation={transform.rotation} onDoubleClick={handlePartDoubleClick}>
        <RenderPreviewItem item={item} frozen={focusedPartKeys.length > 0} />
      </group>
```

## 8. E01 파츠 저장 키 생성

원본: `Developer/r3f_prototype/src/components/GraphicsStudio.jsx`

```js
function getPartTuningId(itemId, focusedParts) {
  if (!focusedParts?.length) return itemId
  const keys = focusedParts.map((part) => part.key).sort()
  if (keys.length === 1) return `${itemId}::part::${keys[0]}`
  return `${itemId}::group::${keys.join('+')}`
}
```

단일 E01 파츠의 저장 키 형식은 `zombie-e01::part::<숫자 경로>`다.

## 9. 숫자 입력란 처리

원본: `Developer/r3f_prototype/src/components/GraphicsStudio.jsx`

```jsx
function SliderRow({ label, name, min, max, step, value, onChange }) {
  const valueText = Number(value).toFixed(step < 1 ? 2 : 0)
  const [draftValue, setDraftValue] = useState(valueText)
  const handleInput = (event) => onChange(Number(event.target.value))
  const commitDraft = () => {
    const next = Number(draftValue)
    if (Number.isFinite(next)) onChange(next)
    else setDraftValue(valueText)
  }
  const handleValueInput = (event) => {
    const nextText = event.target.value
    setDraftValue(nextText)
    const next = Number(nextText)
    if (Number.isFinite(next)) onChange(next)
  }

  useEffect(() => {
    setDraftValue(valueText)
  }, [valueText])

  return (
    <label style={styles.controlRow}>
      <span style={styles.controlLabel}>{label}</span>
      <input
        name={name}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onInput={handleInput}
        onChange={handleInput}
        className="studio-range"
        style={styles.range}
      />
      <input
        name={`${name}Value`}
        type="number"
        min={min}
        max={max}
        step={step}
        value={draftValue}
        onInput={handleValueInput}
        onChange={handleValueInput}
        onBlur={commitDraft}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur()
        }}
        style={styles.controlValueInput}
      />
    </label>
  )
}
```

## 10. 숫자 입력값 정규화

원본: `Developer/r3f_prototype/src/lib/graphicsStudioConfig.js`

```js
export function normalizeStudioTuning(input = {}) {
  const source = input && typeof input === 'object' ? input : {}
  const normalized = { ...DEFAULT_STUDIO_TUNING }

  for (const [key, range] of Object.entries(NUMERIC_RANGES)) {
    normalized[key] = clampNumber(source[key], range, DEFAULT_STUDIO_TUNING[key])
  }

  normalized.scale = Number(normalized.scale.toFixed(2))
  normalized.scaleX = Number(normalized.scaleX.toFixed(2))
  normalized.scaleY = Number(normalized.scaleY.toFixed(2))
  normalized.scaleZ = Number(normalized.scaleZ.toFixed(2))
  normalized.positionX = Number(normalized.positionX.toFixed(2))
  normalized.positionY = Number(normalized.positionY.toFixed(2))
  normalized.positionZ = Number(normalized.positionZ.toFixed(2))
  normalized.outlineThickness = Number(normalized.outlineThickness.toFixed(2))
  normalized.outlineOpacity = Number(normalized.outlineOpacity.toFixed(2))
  normalized.colorStrength = Number(normalized.colorStrength.toFixed(2))
  normalized.saturation = Number(normalized.saturation.toFixed(2))
  normalized.brightness = Number(normalized.brightness.toFixed(2))
  normalized.emissiveIntensity = Number(normalized.emissiveIntensity.toFixed(2))
  normalized.rotationX = Math.round(normalized.rotationX)
  normalized.rotationY = Math.round(normalized.rotationY)
  normalized.rotationZ = Math.round(normalized.rotationZ)
  normalized.outlineColor = normalizeHexColor(source.outlineColor, DEFAULT_STUDIO_TUNING.outlineColor)
  normalized.color = normalizeHexColor(source.color, DEFAULT_STUDIO_TUNING.color)
  normalized.animation = VALID_ANIMATIONS.has(source.animation) ? source.animation : DEFAULT_STUDIO_TUNING.animation

  return normalized
}
```

## 11. 입력값 저장과 실시간 반영

원본: `Developer/r3f_prototype/src/components/GraphicsStudio.jsx`

```js
  const confirmGraphicsTuning = (id, nextTuning) => {
    const next = saveStudioTunings({
      ...loadStudioTunings(),
      [id]: nextTuning,
    })
    setConfirmedTunings(next)
    queueFirebaseSave()
    sendGameSync()
    return next
  }

  const updateTuning = (patch) => {
    setDraftTuningById((current) => {
      const currentTuning = normalizeStudioTuning(current[activeTuningId] ?? confirmedTunings[activeTuningId] ?? DEFAULT_STUDIO_TUNING)
      const nextTuning = normalizeStudioTuning({
        ...currentTuning,
        ...patch,
      })
      if (!isSameTuning(currentTuning, nextTuning)) {
        setUndoStack((stack) => [...stack, { id: activeTuningId, tuning: currentTuning }].slice(-UNDO_LIMIT))
      }
      confirmGraphicsTuning(activeTuningId, nextTuning)
      setApplyStatus('Live')
      return {
        ...current,
        [activeTuningId]: nextTuning,
      }
    })
  }
```

원본: `Developer/r3f_prototype/src/lib/graphicsStudioConfig.js`

```js
export function saveStudioTunings(tunings, storage) {
  const targetStorage = getStorage(storage)
  const existing = targetStorage ? loadStudioTunings(targetStorage) : {}
  const normalized = mergeStudioTuningPatches(existing, tunings)
  targetStorage?.setItem(GRAPHICS_STUDIO_STORAGE_KEY, JSON.stringify(normalized))
  if (!storage && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(GRAPHICS_STUDIO_TUNING_EVENT, { detail: normalized }))
  }
  return normalized
}
```

## 12. 입력값을 Three.js 변형값으로 변환

원본: `Developer/r3f_prototype/src/components/StudioTunedGroup.jsx`

```js
export function getStudioTransformProps(tuning = DEFAULT_STUDIO_TUNING) {
  const t = normalizeStudioTuning(tuning)
  return {
    scale: [t.scale * t.scaleX, t.scale * t.scaleY, t.scale * t.scaleZ],
    position: [t.positionX, t.positionY, t.positionZ],
    rotation: [
      THREE.MathUtils.degToRad(t.rotationX),
      THREE.MathUtils.degToRad(t.rotationY),
      THREE.MathUtils.degToRad(t.rotationZ),
    ],
  }
}
```

## 13. Studio 미리보기에서 base 기준 변형과 원복

원본: `Developer/r3f_prototype/src/components/GraphicsStudioPreview.jsx`

```js
function applyFocusedPartTuning(root, focusedPartKeys, focusedPartTuning) {
  resetFocusedPartTransforms(root)
  syncPartGroupOutlines(root, focusedPartKeys)
  updatePartGroupOutlines(root)
  if (!focusedPartKeys.length || !focusedPartTuning) return

  const transform = getStudioTransformProps(focusedPartTuning)
  focusedPartKeys.forEach((focusedPartKey) => {
    const part = findStudioPart(root, focusedPartKey)
    if (!part) return

    if (!part.userData.studioPartBaseScale) part.userData.studioPartBaseScale = part.scale.clone()
    if (!part.userData.studioPartBaseRotation) part.userData.studioPartBaseRotation = part.rotation.clone()
    if (!part.userData.studioPartBasePosition) part.userData.studioPartBasePosition = part.position.clone()

    part.position.copy(part.userData.studioPartBasePosition).add(new THREE.Vector3(...transform.position))
    part.scale.copy(part.userData.studioPartBaseScale).multiply(new THREE.Vector3(...transform.scale))
    part.rotation.set(
      part.userData.studioPartBaseRotation.x + transform.rotation[0],
      part.userData.studioPartBaseRotation.y + transform.rotation[1],
      part.userData.studioPartBaseRotation.z + transform.rotation[2],
    )
    applyStudioTuning(part, focusedPartTuning)
  })
  updatePartGroupOutlines(root)
}
```

## 14. 게임 런타임에서 저장된 E01 파츠 변형과 원복

원본: `Developer/r3f_prototype/src/components/StudioTunedGroup.jsx`

```js
function resetSavedStudioPartTransforms(root) {
  root.traverse((object) => {
    if (object.userData.studioPartBaseScale) object.scale.copy(object.userData.studioPartBaseScale)
    if (object.userData.studioPartBaseRotation) object.rotation.copy(object.userData.studioPartBaseRotation)
    if (object.userData.studioPartBasePosition) object.position.copy(object.userData.studioPartBasePosition)
  })
}
```

```js
export function applySavedStudioPartTunings(root, itemId, tunings = loadStudioTunings(), { materialTuning = true } = {}) {
  if (!root || !itemId) return
  const savedPartTunings = Object.entries(tunings ?? {})
    .map(([savedKey, tuning]) => getSavedPartTuning(itemId, savedKey, tuning))
    .filter(Boolean)
    .sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'group' ? -1 : 1
      return a.savedKey.localeCompare(b.savedKey)
    })
  if (typeof root.traverse !== 'function') return

  resetSavedStudioPartTransforms(root)
  if (!savedPartTunings.length) return

  const tuningsByPartKey = new Map()
  savedPartTunings.forEach((entry) => {
    entry.partKeys.forEach((partKey) => {
      const entries = tuningsByPartKey.get(partKey) ?? []
      entries.push(entry)
      tuningsByPartKey.set(partKey, entries)
    })
  })

  Array.from(tuningsByPartKey.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([partKey, entries]) => {
      const part = findStudioPartFromRuntimeRoot(root, partKey)
      if (!part) return

      if (!part.userData.studioPartBaseScale) part.userData.studioPartBaseScale = part.scale.clone()
      if (!part.userData.studioPartBaseRotation) part.userData.studioPartBaseRotation = part.rotation.clone()
      if (!part.userData.studioPartBasePosition) part.userData.studioPartBasePosition = part.position.clone()

      _partCombinedPosition.set(0, 0, 0)
      _partCombinedScale.set(1, 1, 1)
      let rotationX = 0
      let rotationY = 0
      let rotationZ = 0
      entries.forEach(({ tuning }) => {
        const transform = getStudioTransformProps(tuning)
        _partCombinedPosition.x += transform.position[0]
        _partCombinedPosition.y += transform.position[1]
        _partCombinedPosition.z += transform.position[2]
        _partCombinedScale.x *= transform.scale[0]
        _partCombinedScale.y *= transform.scale[1]
        _partCombinedScale.z *= transform.scale[2]
        rotationX += transform.rotation[0]
        rotationY += transform.rotation[1]
        rotationZ += transform.rotation[2]
      })

      part.position.copy(part.userData.studioPartBasePosition).add(_partCombinedPosition)
      part.scale.copy(part.userData.studioPartBaseScale).multiply(_partCombinedScale)
      part.rotation.set(
        part.userData.studioPartBaseRotation.x + rotationX,
        part.userData.studioPartBaseRotation.y + rotationY,
        part.userData.studioPartBaseRotation.z + rotationZ,
      )
      if (materialTuning) {
        entries.forEach(({ tuning }) => applyStudioTuning(part, tuning, { scope: 'part' }))
      }
    })
}
```

## 15. 게임 런타임 연결 래퍼

원본: `Developer/r3f_prototype/src/components/StudioTunedGroup.jsx`

```jsx
export default function StudioTunedGroup({ itemId, children, materialTuning = true }) {
  const previewOnly = useContext(StudioPreviewContext)
  const groupRef = useRef(null)
  const [studioState, setStudioState] = useState(() => loadStudioState(itemId))

  useEffect(() => {
    if (previewOnly || typeof window === 'undefined') return undefined
    const update = () => setStudioState(loadStudioState(itemId))
    window.addEventListener(GRAPHICS_STUDIO_TUNING_EVENT, update)
    window.addEventListener(TEXTURE_DECALS_EVENT, update)
    window.addEventListener('storage', update)
    return () => {
      window.removeEventListener(GRAPHICS_STUDIO_TUNING_EVENT, update)
      window.removeEventListener(TEXTURE_DECALS_EVENT, update)
      window.removeEventListener('storage', update)
    }
  }, [itemId, previewOnly])

  const { tuning, tunings, decals } = studioState
  const transform = useMemo(() => getStudioTransformProps(tuning), [tuning])

  useEffect(() => {
    if (previewOnly || !groupRef.current) return
    if (materialTuning) applyStudioTuning(groupRef.current, tuning)
    applySavedStudioPartTunings(groupRef.current, itemId, tunings, { materialTuning })
    syncTextureDecals(groupRef.current, decals)
    invalidate()
  }, [itemId, materialTuning, previewOnly, tuning, tunings, decals])

  useEffect(() => {
    if (previewOnly) return undefined
    const group = groupRef.current
    return () => {
      disposeTextureDecals(group)
      disposeStudioOwnedMaterials(group)
    }
  }, [previewOnly])

  if (previewOnly) return <>{children}</>
  return <group ref={groupRef} scale={transform.scale} position={transform.position} rotation={transform.rotation}>{children}</group>
}
```
