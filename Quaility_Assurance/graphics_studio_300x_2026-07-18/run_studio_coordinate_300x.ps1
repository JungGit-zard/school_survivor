param(
  [string]$Session = 'studio-existing',
  [string]$OutputPath = (Join-Path $PSScriptRoot 'progress.ndjson')
)

$ErrorActionPreference = 'Stop'
$env:AGENT_BROWSER_DEFAULT_TIMEOUT = '120000'

function Invoke-AgentBrowser {
  param([string[]]$CommandArgs)
  $output = & agent-browser --session $Session @CommandArgs
  if ($LASTEXITCODE -ne 0) {
    throw "agent-browser failed: $($CommandArgs -join ' ')"
  }
  return ($output -join "`n")
}

function Get-AgentResult {
  param([string]$RawJson)
  $parsed = $RawJson | ConvertFrom-Json
  if ($null -ne $parsed.data -and $parsed.data.PSObject.Properties.Name -contains 'result') {
    return $parsed.data.result
  }
  if ($null -ne $parsed.result) {
    return $parsed.result
  }
  return $parsed.data
}

function Get-FocusState {
  $js = @'
(() => {
  const labels = Array.from(document.querySelectorAll('span'))
    .map((node) => node.textContent?.trim() ?? '')
  const focusLabel = labels.find((text) => text.startsWith('Part Focus /') || text.startsWith('Part Group /')) ?? null
  const hasExit = Array.from(document.querySelectorAll('button'))
    .some((button) => button.textContent?.trim() === 'Exit Part')
  return { focused: Boolean(focusLabel && hasExit), focusLabel, hasExit }
})()
'@
  return Get-AgentResult (Invoke-AgentBrowser @('--json', 'eval', $js))
}

function Send-CdpDoubleClick {
  param(
    [string]$BrowserWebSocketUrl,
    [double]$X,
    [double]$Y
  )

  $nodeScript = @'
const [wsUrl, xText, yText] = process.argv.slice(1);
const x = Number(xText);
const y = Number(yText);
const ws = new WebSocket(wsUrl);
let nextId = 1;
const pending = new Map();
const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
  const id = nextId++;
  pending.set(id, { resolve, reject });
  ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
});
ws.onmessage = (event) => {
  const message = JSON.parse(String(event.data));
  if (!message.id || !pending.has(message.id)) return;
  const waiter = pending.get(message.id);
  pending.delete(message.id);
  if (message.error) waiter.reject(new Error(JSON.stringify(message.error)));
  else waiter.resolve(message.result);
};
ws.onerror = () => {
  for (const waiter of pending.values()) waiter.reject(new Error('CDP websocket error'));
  pending.clear();
};
await new Promise((resolve, reject) => {
  ws.onopen = resolve;
  const timer = setTimeout(() => reject(new Error('CDP open timeout')), 5000);
  ws.addEventListener('open', () => clearTimeout(timer), { once: true });
});
const { targetInfos } = await send('Target.getTargets');
const target = targetInfos.find((entry) => entry.type === 'page' && entry.url.includes('/graphics-studio'));
if (!target) throw new Error('Studio page target not found');
const { sessionId } = await send('Target.attachToTarget', { targetId: target.targetId, flatten: true });
await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y }, sessionId);
await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1 }, sessionId);
await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: 1 }, sessionId);
await new Promise((resolve) => setTimeout(resolve, 60));
await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 2 }, sessionId);
await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: 2 }, sessionId);
await send('Target.detachFromTarget', { sessionId });
ws.close();
console.log(JSON.stringify({ x, y, targetId: target.targetId }));
'@

  $output = & node --input-type=module -e $nodeScript $BrowserWebSocketUrl ([string]$X) ([string]$Y)
  if ($LASTEXITCODE -ne 0) {
    throw "CDP double-click failed at ($X, $Y)"
  }
  return ($output -join "`n")
}

$url = Invoke-AgentBrowser @('get', 'url')
if ($url -notmatch '/graphics-studio') {
  throw "Session '$Session' is not on Graphics Studio: $url"
}

$focus = Get-FocusState
if (-not $focus.focused) {
  Invoke-AgentBrowser @('dblclick', 'canvas') | Out-Null
  Invoke-AgentBrowser @('wait', '250') | Out-Null
  $focus = Get-FocusState
}

if (-not $focus.focused) {
  $canvasJs = @'
(() => {
  const canvas = Array.from(document.querySelectorAll('canvas'))
    .filter((node) => {
      const box = node.getBoundingClientRect()
      return box.width > 0 && box.height > 0
    })
    .sort((a, b) => {
      const aa = a.getBoundingClientRect()
      const bb = b.getBoundingClientRect()
      return (bb.width * bb.height) - (aa.width * aa.height)
    })[0]
  if (!canvas) return null
  const box = canvas.getBoundingClientRect()
  return { left: box.left, top: box.top, width: box.width, height: box.height }
})()
'@
  $box = Get-AgentResult (Invoke-AgentBrowser @('--json', 'eval', $canvasJs))
  if ($null -eq $box) {
    throw 'Visible Studio canvas not found'
  }

  $cdpUrl = Invoke-AgentBrowser @('get', 'cdp-url')
  $grid = @(
    @(0.50, 0.38), @(0.50, 0.50), @(0.50, 0.62),
    @(0.40, 0.38), @(0.60, 0.38), @(0.40, 0.50),
    @(0.60, 0.50), @(0.40, 0.62), @(0.60, 0.62),
    @(0.32, 0.50), @(0.68, 0.50), @(0.50, 0.72)
  )

  foreach ($point in $grid) {
    $x = [Math]::Round([double]$box.left + ([double]$box.width * [double]$point[0]), 2)
    $y = [Math]::Round([double]$box.top + ([double]$box.height * [double]$point[1]), 2)
    Send-CdpDoubleClick -BrowserWebSocketUrl $cdpUrl -X $x -Y $y | Out-Null
    Invoke-AgentBrowser @('wait', '180') | Out-Null
    $focus = Get-FocusState
    if ($focus.focused) {
      break
    }
  }
}

if (-not $focus.focused) {
  throw 'A Studio part could not be focused with real double-click input'
}

$loopJs = @'
(async () => {
  const input = document.querySelector('input[name="positionXValue"]')
  const range = document.querySelector('input[name="positionX"]')
  if (!input || !range) throw new Error('position X inputs not found')
  const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  if (!nativeSetter) throw new Error('native input setter not found')
  const storageKey = 'escape-zombie-school.graphicsStudioTunings.v1'
  const readStudioStorage = () => {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('invalid Studio storage payload')
    }
    return parsed
  }
  const frame = () => new Promise((resolve) => requestAnimationFrame(resolve))
  const settle = async () => { await frame(); await frame() }
  const originalText = input.value
  const original = Number(originalText)
  const min = Number(input.min || -5)
  const max = Number(input.max || 5)
  const step = Number(input.step || 0.01)
  const precision = (String(step).split('.')[1] || '').length
  const delta = Math.max(step * 10, Math.min(0.25, (max - min) / 20))
  const rawMutation = original + delta <= max ? original + delta : original - delta
  const mutation = Math.min(max, Math.max(min, Math.round(rawMutation / step) * step))
  const mutationText = mutation.toFixed(precision)
  if (![original, min, max, step, mutation].every(Number.isFinite) || step <= 0 || mutation === original) {
    throw new Error('invalid mutation range')
  }

  const visibleCanvas = () => Array.from(document.querySelectorAll('canvas'))
    .filter((node) => {
      const box = node.getBoundingClientRect()
      return box.width > 0 && box.height > 0
    })
    .sort((a, b) => (b.width * b.height) - (a.width * a.height))[0] ?? null

  const canvasSignal = () => {
    const canvas = visibleCanvas()
    if (!canvas) return { available: false, reason: 'no-visible-canvas' }
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    if (!gl) return { available: false, reason: 'no-webgl-context' }
    const width = Math.min(640, gl.drawingBufferWidth)
    const height = Math.min(640, gl.drawingBufferHeight)
    const x = Math.max(0, Math.floor((gl.drawingBufferWidth - width) / 2))
    const y = Math.max(0, Math.floor((gl.drawingBufferHeight - height) / 2))
    const pixels = new Uint8Array(width * height * 4)
    gl.finish()
    gl.readPixels(x, y, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
    let hash = 2166136261 >>> 0
    let nonZero = 0
    for (let i = 0; i < pixels.length; i += 16) {
      if (pixels[i] | pixels[i + 1] | pixels[i + 2] | pixels[i + 3]) nonZero += 1
      hash ^= pixels[i]; hash = Math.imul(hash, 16777619)
      hash ^= pixels[i + 1]; hash = Math.imul(hash, 16777619)
      hash ^= pixels[i + 2]; hash = Math.imul(hash, 16777619)
      hash ^= pixels[i + 3]; hash = Math.imul(hash, 16777619)
    }
    return {
      available: nonZero > 0,
      hash: (hash >>> 0).toString(16).padStart(8, '0'),
      nonZero,
      crop: [x, y, width, height],
      buffer: [gl.drawingBufferWidth, gl.drawingBufferHeight],
    }
  }

  const events = { input: 0, change: 0, blur: 0 }
  const onInput = () => { events.input += 1 }
  const onChange = () => { events.change += 1 }
  const onBlur = () => { events.blur += 1 }
  input.addEventListener('input', onInput)
  input.addEventListener('change', onChange)
  input.addEventListener('blur', onBlur)

  const setThroughInput = async (text) => {
    input.focus({ preventScroll: true })
    nativeSetter.call(input, text)
    input.dispatchEvent(new InputEvent('input', {
      bubbles: true,
      composed: true,
      inputType: 'insertText',
      data: text,
    }))
    input.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
    await frame()
    input.blur()
    await settle()
  }

  await settle()
  const records = []
  let activeStorageId = null
  for (let iteration = 1; iteration <= 300; iteration += 1) {
    const eventStart = { ...events }
    const storageBeforeAll = readStudioStorage()
    const before = { value: input.value, range: range.value, canvas: canvasSignal() }
    await setThroughInput(mutationText)
    const storageMutatedAll = readStudioStorage()
    if (!activeStorageId) {
      const changedIds = Array.from(new Set([
        ...Object.keys(storageBeforeAll),
        ...Object.keys(storageMutatedAll),
      ])).filter((id) => (
        Number(storageBeforeAll[id]?.positionX) !== Number(storageMutatedAll[id]?.positionX)
      ))
      if (changedIds.length === 1) activeStorageId = changedIds[0]
    }
    const mutated = { value: input.value, range: range.value, canvas: canvasSignal() }
    await setThroughInput(originalText)
    const storageRestoredAll = readStudioStorage()
    const restored = { value: input.value, range: range.value, canvas: canvasSignal() }
    const eventDelta = {
      input: events.input - eventStart.input,
      change: events.change - eventStart.change,
      blur: events.blur - eventStart.blur,
    }
    const domMutated = Math.abs(Number(mutated.value) - mutation) < step / 2
      && Math.abs(Number(mutated.range) - mutation) < step / 2
    const domRestored = Math.abs(Number(restored.value) - original) < step / 2
      && Math.abs(Number(restored.range) - original) < step / 2
    const canvasChanged = before.canvas.available && mutated.canvas.available
      && before.canvas.hash !== mutated.canvas.hash
    const canvasRestored = before.canvas.available && restored.canvas.available
      && before.canvas.hash === restored.canvas.hash
    const storage = {
      key: storageKey,
      tuningId: activeStorageId,
      before: activeStorageId ? storageBeforeAll[activeStorageId]?.positionX : null,
      mutated: activeStorageId ? storageMutatedAll[activeStorageId]?.positionX : null,
      restored: activeStorageId ? storageRestoredAll[activeStorageId]?.positionX : null,
    }
    const storageMutated = activeStorageId
      && Math.abs(Number(storage.mutated) - mutation) < step / 2
    const storageRestored = activeStorageId
      && Math.abs(Number(storage.restored) - original) < step / 2
    records.push({
      recordType: 'iteration',
      iteration,
      original,
      mutation,
      before,
      mutated,
      restored,
      eventDelta,
      storage,
      evidence: {
        domMutated,
        domRestored,
        storageMutated: Boolean(storageMutated),
        storageRestored: Boolean(storageRestored),
        webglChanged: Boolean(canvasChanged),
        webglRestored: Boolean(canvasRestored),
      },
      pass: domMutated && domRestored
        && eventDelta.input >= 2 && eventDelta.change >= 2 && eventDelta.blur >= 2
        && storageMutated && storageRestored
        && canvasChanged && canvasRestored,
    })
  }

  input.removeEventListener('input', onInput)
  input.removeEventListener('change', onChange)
  input.removeEventListener('blur', onBlur)
  return {
    recordType: 'run-summary',
    iterations: records.length,
    passed: records.filter((record) => record.pass).length,
    failed: records.filter((record) => !record.pass).length,
    originalValue: originalText,
    finalValue: input.value,
    records,
  }
})()
'@

$rawLines = $loopJs | & agent-browser --session $Session --json eval --stdin
if ($LASTEXITCODE -ne 0) {
  throw 'The 300-iteration browser eval failed'
}
$run = Get-AgentResult ($rawLines -join "`n")
if ($null -eq $run -or $null -eq $run.records -or $run.records.Count -ne 300) {
  throw 'The browser eval did not return exactly 300 iteration records'
}

$focusRecord = [ordered]@{
  recordType = 'focus-acquired'
  session = $Session
  focusLabel = $focus.focusLabel
  recordedAt = [DateTimeOffset]::Now.ToString('o')
}
Add-Content -LiteralPath $OutputPath -Value ($focusRecord | ConvertTo-Json -Compress) -Encoding utf8

foreach ($record in $run.records) {
  Add-Content -LiteralPath $OutputPath -Value ($record | ConvertTo-Json -Compress -Depth 12) -Encoding utf8
}

$summaryRecord = [ordered]@{
  recordType = 'run-summary'
  session = $Session
  iterations = [int]$run.iterations
  passed = [int]$run.passed
  failed = [int]$run.failed
  originalValue = [string]$run.originalValue
  finalValue = [string]$run.finalValue
  recordedAt = [DateTimeOffset]::Now.ToString('o')
}
Add-Content -LiteralPath $OutputPath -Value ($summaryRecord | ConvertTo-Json -Compress) -Encoding utf8

$summaryRecord | ConvertTo-Json -Depth 4
