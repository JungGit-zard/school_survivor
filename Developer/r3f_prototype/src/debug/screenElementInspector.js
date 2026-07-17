const query = typeof window !== 'undefined'
  ? new URLSearchParams(window.location.search)
  : null

if (query?.has('cdp') || query?.has('inspector')) {
  installScreenElementInspector()
}

function installScreenElementInspector() {
  if (window.__zombieSchoolScreenInspector) return

  const panel = document.createElement('aside')
  panel.id = 'screen-element-inspector-panel'
  panel.innerHTML = `
    <header>
      <div>
        <strong>CDP Screen Inspector</strong>
        <small>클릭 또는 드래그한 영역의 요소 정보</small>
      </div>
      <div class="cdp-inspector-actions">
        <button class="cdp-inspector-clear" type="button">Clear</button>
        <button class="cdp-inspector-collapse" type="button">접기</button>
      </div>
    </header>
    <pre>왼쪽 화면을 클릭하거나 드래그하세요.</pre>
  `

  const reopen = document.createElement('button')
  reopen.id = 'screen-element-inspector-reopen'
  reopen.type = 'button'
  reopen.textContent = 'Inspector 열기'

  const selection = document.createElement('div')
  selection.id = 'screen-element-inspector-selection'

  const style = document.createElement('style')
  style.textContent = `
    body.cdp-inspector-active {
      box-sizing: border-box !important;
      padding-right: 380px !important;
      overflow-x: hidden !important;
    }
    #screen-element-inspector-panel {
      position: fixed;
      inset: 0 0 0 auto;
      z-index: 2147483647;
      box-sizing: border-box;
      width: 380px;
      padding: 12px;
      color: #e8f1ff;
      background: #101318;
      border-left: 3px solid #67d4ff;
      box-shadow: -8px 0 24px rgba(0, 0, 0, 0.42);
      font: 12px/1.45 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    }
    #screen-element-inspector-panel header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding-bottom: 10px;
      border-bottom: 1px solid rgba(232, 241, 255, 0.2);
    }
    #screen-element-inspector-panel strong,
    #screen-element-inspector-panel small {
      display: block;
    }
    #screen-element-inspector-panel strong {
      color: #7ee2ff;
      font-size: 15px;
    }
    #screen-element-inspector-panel small {
      margin-top: 3px;
      color: #aeb8c9;
    }
    #screen-element-inspector-panel button {
      padding: 5px 9px;
      color: #f6fbff;
      background: #182231;
      border: 2px solid #67d4ff;
      border-radius: 8px;
      font-weight: 900;
      cursor: pointer;
    }
    #screen-element-inspector-panel .cdp-inspector-actions {
      display: flex;
      gap: 6px;
    }
    #screen-element-inspector-panel pre {
      box-sizing: border-box;
      height: calc(100vh - 72px);
      margin: 10px 0 0;
      padding: 10px;
      overflow: auto;
      color: #dce9ff;
      background: #07090d;
      border-radius: 8px;
      white-space: pre-wrap;
      word-break: break-word;
    }
    #screen-element-inspector-selection {
      position: fixed;
      z-index: 2147483646;
      display: none;
      pointer-events: none;
      background: rgba(103, 212, 255, 0.16);
      border: 2px solid #67d4ff;
    }
    #screen-element-inspector-reopen {
      position: fixed;
      top: 10px;
      right: 10px;
      z-index: 2147483647;
      display: none;
      padding: 7px 10px;
      color: #f6fbff;
      background: #182231;
      border: 2px solid #67d4ff;
      border-radius: 8px;
      font: 900 12px/1 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      cursor: pointer;
    }
    body.cdp-inspector-collapsed {
      padding-right: 0 !important;
    }
    body.cdp-inspector-collapsed #screen-element-inspector-panel {
      display: none;
    }
    body.cdp-inspector-collapsed #screen-element-inspector-reopen {
      display: block;
    }
  `

  document.body.classList.add('cdp-inspector-active')
  document.head.appendChild(style)
  document.body.append(panel, selection, reopen)

  const output = panel.querySelector('pre')
  const state = { dragging: false, startX: 0, startY: 0, lastThreeAt: 0 }

  const inspectPoint = (x, y) => formatReport(
    'point',
    makeRect(x, y, x, y),
    document.elementsFromPoint(x, y).filter(isInspectable)
  )
  const inspectArea = (x1, y1, x2, y2) => {
    const rect = makeRect(x1, y1, x2, y2)
    const elements = [...document.querySelectorAll('body *')]
      .filter(isInspectable)
      .filter(element => intersects(rect, element.getBoundingClientRect()))
    return formatReport('area', rect, elements)
  }
  const inspectThree = (details) => {
    state.lastThreeAt = performance.now()
    output.textContent = formatThreeReport(details)
    return output.textContent
  }

  window.__zombieSchoolScreenInspector = { inspectPoint, inspectArea, inspectThree }

  panel.querySelector('.cdp-inspector-clear').addEventListener('click', () => {
    output.textContent = '왼쪽 화면을 클릭하거나 드래그하세요.'
  })
  panel.querySelector('.cdp-inspector-collapse').addEventListener('click', () => {
    document.body.classList.add('cdp-inspector-collapsed')
    window.dispatchEvent(new Event('resize'))
  })
  reopen.addEventListener('click', () => {
    document.body.classList.remove('cdp-inspector-collapsed')
    window.dispatchEvent(new Event('resize'))
  })

  window.addEventListener('pointerdown', event => {
    if (panel.contains(event.target)) return
    state.dragging = true
    state.startX = event.clientX
    state.startY = event.clientY
    updateSelection(selection, state.startX, state.startY, event.clientX, event.clientY)
  }, true)

  window.addEventListener('pointermove', event => {
    if (!state.dragging) return
    updateSelection(selection, state.startX, state.startY, event.clientX, event.clientY)
  }, true)

  window.addEventListener('pointerup', event => {
    if (!state.dragging) return
    state.dragging = false
    selection.style.display = 'none'
    if (performance.now() - state.lastThreeAt < 250) return
    const isPoint = Math.abs(event.clientX - state.startX) < 6 &&
      Math.abs(event.clientY - state.startY) < 6
    output.textContent = isPoint
      ? inspectPoint(event.clientX, event.clientY)
      : inspectArea(state.startX, state.startY, event.clientX, event.clientY)
  }, true)
}

function makeRect(x1, y1, x2, y2) {
  const left = Math.min(x1, x2)
  const top = Math.min(y1, y2)
  return {
    left,
    top,
    right: Math.max(x1, x2),
    bottom: Math.max(y1, y2),
    width: Math.abs(x2 - x1),
    height: Math.abs(y2 - y1),
  }
}

function updateSelection(selection, x1, y1, x2, y2) {
  const rect = makeRect(x1, y1, x2, y2)
  Object.assign(selection.style, {
    display: 'block',
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
  })
}

function intersects(a, b) {
  return b.width > 0 && b.height > 0 &&
    a.left <= b.right && a.right >= b.left &&
    a.top <= b.bottom && a.bottom >= b.top
}

function isInspectable(element) {
  return element?.nodeType === 1 &&
    !element.id?.startsWith('screen-element-inspector') &&
    !element.closest?.('#screen-element-inspector-panel')
}

function formatReport(mode, rect, elements) {
  const lines = [
    `[mode] ${mode}`,
    `[rect] left=${round(rect.left)} top=${round(rect.top)} width=${round(rect.width)} height=${round(rect.height)}`,
    `[count] ${elements.length}`,
    '',
  ]

  elements.forEach((element, index) => {
    const box = element.getBoundingClientRect()
    const computed = window.getComputedStyle(element)
    const identity = `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ''}`
    lines.push(`#${index + 1} ${identity}`)
    lines.push(`  box: x=${round(box.left)} y=${round(box.top)} w=${round(box.width)} h=${round(box.height)}`)
    lines.push(`  display: ${computed.display}, position: ${computed.position}, z-index: ${computed.zIndex}`)
    lines.push(`  color: ${computed.color}, background: ${computed.backgroundColor}`)
    if (element.getAttribute('aria-label')) lines.push(`  aria-label: ${element.getAttribute('aria-label')}`)
    if (element.getAttribute('data-testid')) lines.push(`  data-testid: ${element.getAttribute('data-testid')}`)
    const text = (element.innerText || element.textContent || '').trim().replace(/\s+/g, ' ')
    if (text) lines.push(`  text: ${text.length > 240 ? `${text.slice(0, 240)}…` : text}`)
    if (element.tagName === 'CANVAS') {
      lines.push(`  canvas: ${element.width}x${element.height}, css=${round(box.width)}x${round(box.height)}`)
    }
    lines.push('')
  })

  return lines.join('\n')
}

function formatThreeReport(details) {
  return [
    '[mode] three-raycast',
    `[object] ${details.objectType}${details.name ? ` name="${details.name}"` : ''}`,
    `[geometry] ${details.geometryType || 'unknown'}`,
    `[material] ${details.materialType || 'unknown'}`,
    `[color] ${details.color || 'none'}`,
    `[uuid] ${details.uuid}`,
    `[point] x=${details.point.x} y=${details.point.y} z=${details.point.z}`,
    `[distance] ${details.distance}`,
    `[hierarchy] ${details.hierarchy.join(' > ')}`,
  ].join('\n')
}

function round(value) {
  return Number(value || 0).toFixed(1)
}
