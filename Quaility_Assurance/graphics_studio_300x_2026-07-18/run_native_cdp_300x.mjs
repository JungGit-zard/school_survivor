import fs from 'node:fs'

const browserWs = process.argv[2]
const progressPath = process.argv[3]
const runId = process.argv[4] || 'graphics-studio-300x-2026-07-18-r3'
const targetUrl = 'http://127.0.0.1:5173/graphics-studio'
const modelId = 'zombie-e04'
const modelLabel = 'Zombie E04'
const partLabel = 'BoxGeometry'
const controlName = 'positionXValue'
const storageKey = 'escape-zombie-school.graphicsStudioTunings.v1'

if (!browserWs || !progressPath) {
  throw new Error('usage: node run_native_cdp_300x.mjs <browser-ws> <progress.ndjson> [run-id]')
}

const ws = new WebSocket(browserWs)
const pending = new Map()
let nextId = 1

await new Promise((resolve, reject) => {
  ws.addEventListener('open', resolve, { once: true })
  ws.addEventListener('error', reject, { once: true })
})

ws.addEventListener('message', (event) => {
  const message = JSON.parse(event.data)
  if (!message.id) return
  const waiter = pending.get(message.id)
  if (!waiter) return
  pending.delete(message.id)
  if (message.error) waiter.reject(new Error(JSON.stringify(message.error)))
  else waiter.resolve(message.result)
})

function call(method, params = {}, sessionId) {
  const id = nextId++
  const message = { id, method, params }
  if (sessionId) message.sessionId = sessionId
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    ws.send(JSON.stringify(message))
  })
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const append = (record) => fs.appendFileSync(progressPath, `${JSON.stringify(record)}\n`, 'utf8')
const nowKst = () => new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Asia/Seoul',
  dateStyle: 'short',
  timeStyle: 'medium',
  hour12: false,
}).format(new Date()).replace(' ', 'T') + '+09:00'

const { targetInfos } = await call('Target.getTargets')
const page = targetInfos.find((target) => target.type === 'page' && target.url === targetUrl)
if (!page) throw new Error(`target page not found: ${targetUrl}`)
const { sessionId } = await call('Target.attachToTarget', { targetId: page.targetId, flatten: true })

async function evaluate(expression) {
  const response = await call('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  }, sessionId)
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.text)
  return response.result.value
}

async function mouseClick(x, y, clickCount = 1) {
  await call('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y }, sessionId)
  await call('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    x,
    y,
    button: 'left',
    buttons: 1,
    clickCount,
  }, sessionId)
  await call('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    x,
    y,
    button: 'left',
    buttons: 0,
    clickCount,
  }, sessionId)
}

async function doubleClick(x, y) {
  await mouseClick(x, y, 1)
  await wait(18)
  await mouseClick(x, y, 2)
}

async function pressCtrlA() {
  await call('Input.dispatchKeyEvent', {
    type: 'rawKeyDown',
    key: 'Control',
    code: 'ControlLeft',
    windowsVirtualKeyCode: 17,
    nativeVirtualKeyCode: 17,
    modifiers: 2,
  }, sessionId)
  await call('Input.dispatchKeyEvent', {
    type: 'keyDown',
    key: 'a',
    code: 'KeyA',
    windowsVirtualKeyCode: 65,
    nativeVirtualKeyCode: 65,
    modifiers: 2,
  }, sessionId)
  await call('Input.dispatchKeyEvent', {
    type: 'keyUp',
    key: 'a',
    code: 'KeyA',
    windowsVirtualKeyCode: 65,
    nativeVirtualKeyCode: 65,
    modifiers: 2,
  }, sessionId)
  await call('Input.dispatchKeyEvent', {
    type: 'keyUp',
    key: 'Control',
    code: 'ControlLeft',
    windowsVirtualKeyCode: 17,
    nativeVirtualKeyCode: 17,
    modifiers: 0,
  }, sessionId)
}

async function pressTab() {
  await call('Input.dispatchKeyEvent', {
    type: 'rawKeyDown',
    key: 'Tab',
    code: 'Tab',
    windowsVirtualKeyCode: 9,
    nativeVirtualKeyCode: 9,
  }, sessionId)
  await call('Input.dispatchKeyEvent', {
    type: 'keyUp',
    key: 'Tab',
    code: 'Tab',
    windowsVirtualKeyCode: 9,
    nativeVirtualKeyCode: 9,
  }, sessionId)
}

async function inputText(x, y, text) {
  await mouseClick(x, y)
  await pressCtrlA()
  await call('Input.insertText', { text }, sessionId)
  await pressTab()
  await wait(35)
}

const canvasRect = await evaluate(`(() => {
  const canvas = document.querySelector("section[aria-label='Graphics Studio'] canvas")
  if (!canvas) return null
  const r = canvas.getBoundingClientRect()
  return { x: r.x, y: r.y, width: r.width, height: r.height }
})()`)
if (!canvasRect) throw new Error('main canvas not found')

const centerX = canvasRect.x + canvasRect.width / 2
const centerY = canvasRect.y + canvasRect.height / 2
const points = []
for (let y = canvasRect.y + 8; y < canvasRect.y + canvasRect.height - 8; y += 14) {
  for (let x = canvasRect.x + 8; x < canvasRect.x + canvasRect.width - 8; x += 14) {
    points.push({ x, y, distance: Math.hypot(x - centerX, y - centerY) })
  }
}
points.sort((a, b) => a.distance - b.distance)

let hit = null
for (const point of points) {
  await doubleClick(point.x, point.y)
  await wait(24)
  const focused = await evaluate(`document.body.innerText.includes('Exit Part')`)
  if (focused) {
    hit = { x: Math.round(point.x), y: Math.round(point.y) }
    break
  }
}
if (!hit) throw new Error('no selectable part found through native CDP double click grid')

const precondition = await evaluate(`(() => {
  const input = document.querySelector("input[name='${controlName}']")
  const range = document.querySelector("input[name='positionX']")
  const body = document.body.innerText
  const raw = localStorage.getItem('${storageKey}')
  if (!input || !range) return null
  const r = input.getBoundingClientRect()
  return {
    inputRect: { x: r.x, y: r.y, width: r.width, height: r.height },
    originalValue: input.value,
    rangeValue: range.value,
    min: input.min,
    max: input.max,
    step: input.step,
    firebaseLocal: body.includes('Firebase: local'),
    partFocused: body.includes('Part Focus / ${partLabel}'),
    rawStorage: raw
  }
})()`)
if (!precondition?.partFocused) throw new Error('expected part focus label not present')
if (!precondition.firebaseLocal) throw new Error('Firebase local precondition failed')

const originalValue = precondition.originalValue
const originalNumber = Number(originalValue)
const step = Number(precondition.step)
const min = Number(precondition.min)
const max = Number(precondition.max)
const candidate = originalNumber + 0.25 <= max ? originalNumber + 0.25 : originalNumber - 0.25
const mutatedNumber = Math.max(min, Math.min(max, Math.round(candidate / step) * step))
const precision = (String(precondition.step).split('.')[1] || '').length
const mutatedValue = mutatedNumber.toFixed(precision)
if (mutatedValue === originalValue) throw new Error('mutation equals original value')

append({
  recordType: 'precondition',
  runId,
  modelId,
  modelLabel,
  partLabel,
  selectedBy: 'CDP Input.dispatchMouseEvent clickCount=1 then clickCount=2',
  hit,
  controlName,
  originalValue,
  mutatedValue,
  firebaseLocal: true,
  applyClicks: 0,
  resetClicks: 0,
  timestamp: nowKst(),
})

const inputX = precondition.inputRect.x + precondition.inputRect.width / 2
const inputY = precondition.inputRect.y + precondition.inputRect.height / 2

let passed = 0
let failed = 0
let partKey = partLabel

for (let repeatIndex = 1; repeatIndex <= 300; repeatIndex += 1) {
  const startedAt = nowKst()
  await inputText(inputX, inputY, mutatedValue)
  const mutatedObserved = await evaluate(`(() => ({
    input: document.querySelector("input[name='${controlName}']")?.value ?? null,
    range: document.querySelector("input[name='positionX']")?.value ?? null,
    live: document.body.innerText.includes('Live'),
    focused: document.body.innerText.includes('Exit Part'),
    storage: localStorage.getItem('${storageKey}')
  }))()`)

  if (partKey === partLabel && mutatedObserved.storage) {
    try {
      const before = JSON.parse(precondition.rawStorage || '{}')
      const after = JSON.parse(mutatedObserved.storage)
      const changedKey = Object.keys(after).find((key) =>
        key.startsWith(`${modelId}::part::`) && JSON.stringify(before[key]) !== JSON.stringify(after[key]))
      partKey = changedKey || partLabel
    } catch {
      partKey = partLabel
    }
  }

  await inputText(inputX, inputY, originalValue)
  const restoredObserved = await evaluate(`(() => ({
    input: document.querySelector("input[name='${controlName}']")?.value ?? null,
    range: document.querySelector("input[name='positionX']")?.value ?? null,
    live: document.body.innerText.includes('Live'),
    focused: document.body.innerText.includes('Exit Part')
  }))()`)

  const visualChanged = mutatedObserved.input === mutatedValue
    && mutatedObserved.range === String(mutatedNumber)
    && mutatedObserved.live
    && mutatedObserved.focused
  const visualRestored = Number(restoredObserved.input) === originalNumber
    && Number(restoredObserved.range) === originalNumber
    && restoredObserved.live
    && restoredObserved.focused
  const pass = visualChanged && visualRestored
  if (pass) passed += 1
  else failed += 1

  append({
    recordType: 'iteration',
    runId,
    seq: repeatIndex,
    modelId,
    modelLabel,
    partKey,
    partLabel,
    repeatIndex,
    controlName,
    originalValue,
    mutatedValue,
    observedMutatedInputValue: mutatedObserved.input,
    observedMutatedRangeValue: mutatedObserved.range,
    observedRestoredInputValue: restoredObserved.input,
    observedRestoredRangeValue: restoredObserved.range,
    visualChanged,
    visualRestored,
    actionMethod: 'CDP Input.dispatchMouseEvent + Input.dispatchKeyEvent Ctrl+A + Input.insertText',
    applyClicks: 0,
    resetClicks: 0,
    timestamp: startedAt,
    pass,
    failureReason: pass ? null : 'native input readback or visible Live/Part Focus state mismatch',
  })
}

const finalState = await evaluate(`(() => ({
  input: document.querySelector("input[name='${controlName}']")?.value ?? null,
  range: document.querySelector("input[name='positionX']")?.value ?? null,
  rawStorage: localStorage.getItem('${storageKey}')
}))()`)

let storageRestored = finalState.rawStorage === precondition.rawStorage
let storageCleanup = 'not-needed'
if (!storageRestored) {
  await call('DOMStorage.enable', {}, sessionId)
  await call('DOMStorage.setDOMStorageItem', {
    storageId: { securityOrigin: 'http://127.0.0.1:5173', isLocalStorage: true },
    key: storageKey,
    value: precondition.rawStorage ?? '{}',
  }, sessionId)
  storageCleanup = 'CDP DOMStorage.setDOMStorageItem exact original raw value'
  const cleaned = await evaluate(`localStorage.getItem('${storageKey}')`)
  storageRestored = cleaned === precondition.rawStorage
}

append({
  recordType: 'summary',
  runId,
  status: failed === 0 && storageRestored ? 'part_complete' : 'part_failed',
  modelId,
  modelLabel,
  partKey,
  partLabel,
  completedIterations: 300,
  passed,
  failed,
  finalInputValue: finalState.input,
  finalRangeValue: finalState.range,
  storageRestored,
  storageCleanup,
  applyClicks: 0,
  resetClicks: 0,
  endedAtKst: nowKst(),
})

console.log(JSON.stringify({ runId, modelLabel, partKey, completed: 300, passed, failed, storageRestored, hit }))
ws.close()
