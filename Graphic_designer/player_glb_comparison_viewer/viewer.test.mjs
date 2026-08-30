import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const viewerRoot = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(viewerRoot, '..', '..')
const readViewer = (relativePath) => readFileSync(path.join(viewerRoot, relativePath), 'utf8')

const expectedGlbHash = '690b2d3e543c5224ae1db3900df32fd177819b47ab697d31aa9d34000ef20df4'
const glbPath = path.join(viewerRoot, 'assets', 'player-image2-2_5head-new-comparison.glb')

test('independent viewer keeps its model asset under the external Graphic_designer folder', () => {
  assert.equal(existsSync(glbPath), true)
  assert.equal(statSync(glbPath).size, 174040)
  assert.equal(createHash('sha256').update(readFileSync(glbPath)).digest('hex'), expectedGlbHash)
})

test('HTML uses only local static imports and documents orbit, zoom, pan, reset controls', () => {
  const html = readViewer('index.html')
  assert.match(html, /\.\/vendor\/three\.module\.js/)
  assert.match(html, /\.\/vendor\//)
  assert.match(html, /\.\/viewer\.js/)
  assert.match(html, /마우스 왼쪽 드래그/)
  assert.match(html, /휠 스크롤/)
  assert.match(html, /마우스 오른쪽 드래그/)
  assert.match(html, /R 또는 보기 초기화/)
  assert.doesNotMatch(html, /Developer\/r3f_prototype|\/src\/playerGlbViewer|Firebase|GraphicsStudio|localStorage/)
})

test('viewer script loads the local comparison GLB and enables orbit, zoom, right-drag pan, touch, and reset', () => {
  const source = readViewer('viewer.js')
  assert.match(source, /\.\/assets\/player-image2-2_5head-new-comparison\.glb/)
  assert.match(source, /OrbitControls/)
  assert.match(source, /enablePan = true/)
  assert.match(source, /enableZoom = true/)
  assert.match(source, /LEFT: THREE\.MOUSE\.ROTATE/)
  assert.match(source, /MIDDLE: THREE\.MOUSE\.DOLLY/)
  assert.match(source, /RIGHT: THREE\.MOUSE\.PAN/)
  assert.match(source, /ONE: THREE\.TOUCH\.ROTATE/)
  assert.match(source, /TWO: THREE\.TOUCH\.DOLLY_PAN/)
  assert.match(source, /resetButton\.addEventListener\('click'/)
  assert.match(source, /event\.key\.toLowerCase\(\) === 'r'/)
  assert.doesNotMatch(source, /Developer\/r3f_prototype|firebase|Firebase|GraphicsStudio|localStorage|player-image2-2026-08-29\.glb/)
})

test('minimum vendored Three.js browser modules and upstream license exist locally', () => {
  for (const relativePath of [
    'vendor/three.module.js',
    'vendor/controls/OrbitControls.js',
    'vendor/loaders/GLTFLoader.js',
    'vendor/utils/BufferGeometryUtils.js',
    'vendor/LICENSE',
  ]) {
    assert.equal(existsSync(path.join(viewerRoot, relativePath)), true, relativePath)
  }
})

test('game project viewer coupling files are absent', () => {
  for (const relativePath of [
    'Developer/r3f_prototype/player-glb-viewer.html',
    'Developer/r3f_prototype/src/playerGlbViewer.js',
    'Developer/r3f_prototype/src/playerGlbViewer.test.js',
    'Developer/r3f_prototype/src/assets/models/player/comparison',
  ]) {
    assert.equal(existsSync(path.join(repoRoot, relativePath)), false, relativePath)
  }
})
