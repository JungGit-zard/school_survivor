#!/usr/bin/env node
// Sltera Coast Run 동기화 — 백업 폴더의 독립 레이서(index.html + audio.js)를 게임 정적 페이지로 복사하고
// 1) three.js CDN import를 게임에 설치된 three(node_modules)로 바꾸고, 2) '학교로 돌아가기' 브리지를 붙이고,
// 3) window.__game 테스트 도우미를 떼어 낸다. 원본(백업 폴더)은 절대 고치지 않는다.
//
//   node scripts/sync-sltera-run.mjs [원본 폴더]
//   기본 원본: F:/ezs-work/backup/sltera_racer_20261122
//
// 출력: public/minigame/sltera-run/{index.html, audio.js, vendor/three.module.js, vendor/addons/…(레이서가 쓰는 addon만)}
// 본게임은 SlteraRunOverlay.jsx가 이 페이지를 전체 화면 iframe으로 띄우고, 'sltera-run:exit' 메시지로 닫는다.
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SOURCE_DIR = path.resolve(process.argv[2] ?? 'F:/ezs-work/backup/sltera_racer_20261122')
const OUT_DIR = path.join(APP_ROOT, 'public', 'minigame', 'sltera-run')
const THREE_DIR = path.join(APP_ROOT, 'node_modules', 'three')

export const EXIT_MESSAGE_TYPE = 'sltera-run:exit'

// three: 게임과 같은 설치본(node_modules/three). addon은 레이서가 실제로 import하는 'three/addons/…' 파일과
// 그 파일들의 상대 import를 따라가며 전부 복사한다(빠진 addon 하나가 모듈 전체를 조용히 멈춘다 — 11-22 GLTFLoader).
export function listRacerAddonImports(html) {
  return [...new Set([...html.matchAll(/from\s+['"]three\/addons\/([^'"]+)['"]/g)].map((m) => m[1]))]
}

function copyAddonTree(relPath, seen) {
  if (seen.has(relPath)) return
  seen.add(relPath)
  const source = path.join(THREE_DIR, 'examples', 'jsm', relPath)
  const target = path.join(OUT_DIR, 'vendor', 'addons', relPath)
  mkdirSync(path.dirname(target), { recursive: true })
  copyFileSync(source, target)
  const code = readFileSync(source, 'utf8')
  for (const m of code.matchAll(/(?:from|import)\s*\(?\s*['"](\.{1,2}\/[^'"]+)['"]/g)) {
    copyAddonTree(path.posix.normalize(path.posix.join(path.posix.dirname(relPath), m[1])), seen)
  }
}

const BRIDGE_STYLE = `<style id="sltera-run-bridge-style">
#exitToSchoolBtn { margin-top: 10px; min-height: 48px; }
#exitCornerBtn { position: fixed; top: max(8px, env(safe-area-inset-top)); left: 50%; transform: translateX(-50%); z-index: 50;
  min-width: 44px; min-height: 44px; padding: 0 14px; border-radius: 22px; border: 2px solid rgba(255,255,255,.7);
  background: rgba(20,10,30,.55); color: #fff; font: 700 14px system-ui, sans-serif; }
</style>`

// 게임 오버 화면에 '학교로 돌아가기', 화면 위 가운데에 작은 나가기(×) — 둘 다 부모 창에 같은 메시지를 보낸다.
const BRIDGE_SCRIPT = `<script id="sltera-run-bridge">
(() => {
  // Sltera Coast Run → Escape! zombie school 브리지(scripts/sync-sltera-run.mjs가 붙임). 결과는 본게임과 무관.
  const exit = () => { try { parent.postMessage({ type: '${EXIT_MESSAGE_TYPE}' }, location.origin) } catch (e) { /* standalone */ } };
  const inFrame = window.parent && window.parent !== window;
  const over = document.getElementById('overScreen');
  const anchor = document.getElementById('stageSelBtn') || document.getElementById('restartBtn');
  if (over) {
    const btn = document.createElement('button');
    btn.id = 'exitToSchoolBtn'; btn.type = 'button'; btn.className = 'btn2'; btn.textContent = '학교로 돌아가기';
    btn.addEventListener('click', (e) => { e.stopPropagation(); exit(); });
    if (anchor && anchor.parentNode) { anchor.parentNode.insertBefore(document.createElement('br'), anchor.nextSibling); anchor.parentNode.insertBefore(btn, anchor.nextSibling.nextSibling); }
    else over.appendChild(btn);
  }
  if (inFrame) {
    const corner = document.createElement('button');
    corner.id = 'exitCornerBtn'; corner.type = 'button'; corner.setAttribute('aria-label', '학교로 돌아가기'); corner.textContent = '✕ 나가기';
    corner.addEventListener('pointerdown', (e) => e.stopPropagation());
    corner.addEventListener('click', (e) => { e.stopPropagation(); exit(); });
    document.body.appendChild(corner);
  }
  // Esc는 레이서의 일시정지 키라 가로채지 않는다(나가기는 위 버튼·게임 오버 버튼).
})();
</script>`

function replaceOnce(source, pattern, replacement, label) {
  const matches = source.match(new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`))
  if (!matches || matches.length !== 1) throw new Error(`sync-sltera-run: expected exactly one ${label}, found ${matches?.length ?? 0}`)
  return source.replace(pattern, replacement)
}

export function patchRacerHtml(html) {
  let out = html
  // 1) import map: CDN three → 같은 폴더의 vendor 사본
  out = replaceOnce(out, /"three"\s*:\s*"https:\/\/cdn\.jsdelivr\.net\/npm\/three@[^"]+\/build\/three\.module\.js"/, '"three": "./vendor/three.module.js"', 'three CDN import')
  out = replaceOnce(out, /"three\/addons\/"\s*:\s*"https:\/\/cdn\.jsdelivr\.net\/npm\/three@[^"]+\/examples\/jsm\/"/, '"three/addons/": "./vendor/addons/"', 'three addons CDN import')
  if (/cdn\.jsdelivr\.net|unpkg\.com/.test(out)) throw new Error('sync-sltera-run: racer still references a CDN')
  // 2) window.__game 테스트 도우미 제거: 'window.__game = {' 부터 짝이 맞는 '};' 까지
  const start = out.indexOf('window.__game = {')
  if (start >= 0) {
    let depth = 0
    let end = -1
    for (let i = out.indexOf('{', start); i < out.length; i += 1) {
      if (out[i] === '{') depth += 1
      else if (out[i] === '}') { depth -= 1; if (depth === 0) { end = i + 1; break } }
    }
    if (end < 0) throw new Error('sync-sltera-run: unbalanced window.__game block')
    if (out[end] === ';') end += 1
    // 빈 블록 {} 으로 바꾼다: 원본이 `if (debug) window.__game = {...}` 처럼 조건문 몸체로 둘 수도 있어 주석만 남기면 문법 오류가 난다.
    out = `${out.slice(0, start)}{} // (테스트 도우미 블록은 게임 배포본에서 제거됨)${out.slice(end)}`
  }
  if (out.includes('window.__game')) throw new Error('sync-sltera-run: window.__game still present')
  // 3) 브리지
  // 레이서가 embed 모드에서 스스로 'sltera-run:exit'를 보내면(최종본) 브리지를 붙이지 않는다.
  if (!out.includes(EXIT_MESSAGE_TYPE)) {
    out = replaceOnce(out, /<\/head>/i, `${BRIDGE_STYLE}\n</head>`, '</head>')
    out = replaceOnce(out, /<\/body>/i, `${BRIDGE_SCRIPT}\n</body>`, '</body>')
  }
  // 4) 저장 금지 확인 — 이 미니게임은 아무 것도 남기지 않는다.
  if (/localStorage|sessionStorage|indexedDB|document\.cookie/.test(out)) throw new Error('sync-sltera-run: racer touches browser storage')
  return out
}

function main() {
  const html = readFileSync(path.join(SOURCE_DIR, 'index.html'), 'utf8')
  const audio = readFileSync(path.join(SOURCE_DIR, 'audio.js'), 'utf8')
  if (/localStorage|sessionStorage|indexedDB|document\.cookie/.test(audio)) throw new Error('sync-sltera-run: audio.js touches browser storage')
  mkdirSync(OUT_DIR, { recursive: true })
  writeFileSync(path.join(OUT_DIR, 'index.html'), patchRacerHtml(html).replace(/\r\n/g, '\n'))
  writeFileSync(path.join(OUT_DIR, 'audio.js'), audio.replace(/\r\n/g, '\n'))
  mkdirSync(path.join(OUT_DIR, 'vendor'), { recursive: true })
  copyFileSync(path.join(THREE_DIR, 'build', 'three.module.js'), path.join(OUT_DIR, 'vendor', 'three.module.js'))
  const addons = new Set()
  for (const rel of listRacerAddonImports(html)) copyAddonTree(rel, addons)
  const version = JSON.parse(readFileSync(path.join(THREE_DIR, 'package.json'), 'utf8')).version
  console.log(`sltera-run synced from ${SOURCE_DIR} -> ${path.relative(APP_ROOT, OUT_DIR)} (three ${version}; addons: ${[...addons].join(', ')})`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main()
