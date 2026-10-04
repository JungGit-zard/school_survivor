import playwrightTest from '../../../../Developer/r3f_prototype/node_modules/@playwright/test/index.js';
const { chromium } = playwrightTest;
import fs from 'node:fs/promises';
import path from 'node:path';

const baseUrl = 'http://localhost:8788/Graphic_designer/game_resource_library/player_r3f_blender_20261003/10_v9_backpack_viewer/PLAYER_v9_standalone_viewer.html';
const outDir = path.resolve('Graphic_designer/game_resource_library/player_r3f_blender_20261003/10_v9_backpack_viewer/qa_yup_screenshots');
await fs.mkdir(outDir, { recursive: true });
const qa = { url: baseUrl, generatedAt: new Date().toISOString(), assertions: [], screenshots: [] };
function assert(name, pass, details = {}) {
  qa.assertions.push({ name, pass: !!pass, details });
  if (!pass) throw new Error(`${name} failed: ${JSON.stringify(details)}`);
}
function close(a, b, eps = 0.04) { return Math.abs(a - b) <= eps; }
function intersects(a, b) { return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom); }
async function state(page) { return await page.evaluate(() => window.__PLAYER_V9_VIEWER_QA__.state()); }
async function assertFullFrame(page, view, s) {
  const b = s.projectedBounds;
  const margin = 28;
  assert(`${view} GLB projected box stays fully inside 1280x900 viewport`, b && b.left >= margin && b.top >= margin && b.right <= b.viewport.width - margin && b.bottom <= b.viewport.height - margin, { projectedBounds: b, margin });
  const statusRect = await page.locator('#status').evaluate(el => {
    const r = el.getBoundingClientRect();
    return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
  });
  assert(`${view} status overlay does not occlude projected GLB box`, !intersects(b, statusRect), { projectedBounds: b, statusRect });
}
async function shot(page, name) {
  const file = path.join(outDir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  qa.screenshots.push(file.replaceAll('\\', '/'));
}
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
  const consoleMessages = [];
  page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));
  page.on('pageerror', err => consoleMessages.push({ type: 'pageerror', text: err.message }));
  const response = await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  assert('html loaded over local server', response && response.ok(), { status: response?.status() });
  await page.waitForFunction(() => window.__PLAYER_V9_VIEWER_QA__?.state().loaded === true, null, { timeout: 15000 });
  await page.locator('#auto').uncheck();
  let s = await state(page);
  assert('GLB is upright Y-up, not lying on side', s.bboxSize[1] > s.bboxSize[0] * 1.6 && s.bboxSize[1] > s.bboxSize[2] * 1.35, { bboxSize: s.bboxSize });
  assert('camera up is Y axis', close(s.cameraUp[0], 0) && close(s.cameraUp[1], 1) && close(s.cameraUp[2], 0), { cameraUp: s.cameraUp });
  assert('status is Korean and debug node list removed', /로드 완료/.test(s.status) && !/Key nodes|grp_arm|Backpack_main/.test(s.status), { status: s.status });

  for (const view of ['front', 'side', 'back', 'threeq']) {
    await page.locator(`#${view}`).click();
    await page.waitForTimeout(150);
    s = await state(page);
    if (view === 'front') assert('front snap uses +Z camera', s.cameraPosition[2] > s.target[2] + 3.5, { cameraPosition: s.cameraPosition, target: s.target });
    if (view === 'back') assert('back snap uses -Z camera', s.cameraPosition[2] < s.target[2] - 3.5, { cameraPosition: s.cameraPosition, target: s.target });
    if (view === 'side') assert('side snap uses X camera', s.cameraPosition[0] < s.target[0] - 3.5, { cameraPosition: s.cameraPosition, target: s.target });
    if (view === 'threeq') assert('3/4 snap frames +X/+Z', s.cameraPosition[0] > s.target[0] + 2.5 && s.cameraPosition[2] > s.target[2] + 2.5, { cameraPosition: s.cameraPosition, target: s.target });
    await assertFullFrame(page, view, s);
    await shot(page, `view_${view}`);
  }

  await page.locator('[data-action="walk"]').click();
  await page.waitForTimeout(240);
  s = await state(page);
  assert('walk action loops with upright Y-up bbox', s.active.type === 'walk' && s.bboxSize[1] > s.bboxSize[0] * 1.6, { active: s.active, bboxSize: s.bboxSize });
  await shot(page, 'action_walk');

  await page.locator('[data-action="boxCutter"]').click();
  await page.waitForTimeout(220);
  s = await state(page);
  assert('box cutter action status is explicit Korean timing', /커터칼/.test(s.status) && /460ms/.test(s.status), { status: s.status });
  await shot(page, 'action_blade');

  await page.locator('[data-action="pencil"]').click();
  await page.waitForTimeout(50);
  s = await state(page);
  assert('pencil action creates projectile-only object at Y-up hand height', s.pencil && s.pencil.position[1] > 1.25 && s.pencil.position[2] > 0.5, { pencil: s.pencil });
  await shot(page, 'action_pencil');

  await page.locator('[data-action="hit"]').click();
  await page.waitForTimeout(260);
  s = await state(page);
  assert('hit knockback moves along depth Z, not vertical Y', s.rootPosition[2] < -0.08 && Math.abs(s.rootPosition[1]) < 0.02, { rootPosition: s.rootPosition });
  await shot(page, 'action_hit');

  await page.locator('[data-action="heal"]').click();
  await page.waitForTimeout(180);
  s = await state(page);
  assert('heal ring lies on XZ ground plane for Y-up', s.heal && close(s.heal.position[1], 0.05, 0.03) && close(Math.abs(s.heal.rotation[0]), Math.PI / 2, 0.04), { heal: s.heal });

  await page.locator('[data-action="death"]').click();
  await page.waitForTimeout(120);
  s = await state(page);
  assert('death falls sideways around Z while staying above ground', close(s.rootRotation[2], -Math.PI / 2, 0.05) && s.rootPosition[1] > 0.12, { rootRotation: s.rootRotation, rootPosition: s.rootPosition });

  await page.locator('[data-action="clear"]').click();
  await page.locator('#auto').check();
  s = await state(page);
  const before = s.rootRotation;
  await page.waitForTimeout(450);
  s = await state(page);
  assert('auto rotate changes root Y rotation, not Z', Math.abs(s.rootRotation[1] - before[1]) > 0.08 && Math.abs(s.rootRotation[2] - before[2]) < 0.03, { before, after: s.rootRotation });

  const blockingMessages = consoleMessages.filter(m => (m.type === 'pageerror') || (/error/i.test(m.type) && !/404 \(File not found\)/.test(m.text) && !/favicon/i.test(m.text)));
  assert('no blocking browser page errors (favicon 404 ignored)', blockingMessages.length === 0, { consoleMessages, blockingMessages });
  qa.consoleMessages = consoleMessages;
  qa.pass = true;
} finally {
  await browser.close();
  qa.summary = `${qa.assertions.filter(a => a.pass).length}/${qa.assertions.length} assertions passed`;
  await fs.writeFile(path.resolve('Graphic_designer/game_resource_library/player_r3f_blender_20261003/10_v9_backpack_viewer/PLAYER_v9_yup_viewer_qa.json'), JSON.stringify(qa, null, 2));
}
