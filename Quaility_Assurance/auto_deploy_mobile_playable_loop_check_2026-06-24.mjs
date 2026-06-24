import { createRequire } from 'module';

const require = createRequire('D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/r3f_prototype/package.json');
const { chromium } = require('playwright');

const screenshotPath = 'D:/JungSil/2.Minigame_project/school_survivor-integration/Quaility_Assurance/screenshots/auto-deploy-mobile-playable-loop-2026-06-24.png';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 2,
});
const page = await context.newPage();
const consoleMessages = [];
const pageErrors = [];
page.on('console', (msg) => consoleMessages.push(`${msg.type()}: ${msg.text()}`));
page.on('pageerror', (err) => pageErrors.push(String(err)));

const checkpoints = [];
const checkpoint = async (name) => {
  const bodyText = await page.locator('body').innerText().catch(() => '');
  checkpoints.push({ name, bodyText: bodyText.slice(0, 240) });
  return bodyText;
};

try {
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    localStorage.setItem('school_survivor:userNicknames', JSON.stringify({ local: 'QA모바일' }));
  });
  await page.reload({ waitUntil: 'networkidle' });
  await checkpoint('title-loaded');

  await page.getByRole('button', { name: '게임 시작' }).click();
  const nicknameInput = page.getByLabel('유저 닉네임');
  if (await nicknameInput.isVisible({ timeout: 1200 }).catch(() => false)) {
    await nicknameInput.fill('QA모바일');
    await page.getByRole('button', { name: '저장하고 시작' }).click();
  }

  await page.getByText('Stage 1').waitFor({ timeout: 10000 });
  await page.getByText(/HP\s*100\s*\/\s*100|HP\s*\d+\s*\/\s*100/).waitFor({ timeout: 10000 });
  await checkpoint('stage1-started');

  // Touch joystick smoke: press and drag inside the 390x844 mobile viewport.
  await page.touchscreen.tap(195, 690);
  await page.mouse.move(195, 690);
  await page.mouse.down();
  await page.mouse.move(235, 650, { steps: 8 });
  await page.waitForTimeout(800);
  await page.mouse.up();
  await checkpoint('touch-joystick-dragged');

  const pauseButton = page.locator('button').filter({ hasText: 'Ⅱ' }).first();
  await pauseButton.click({ timeout: 5000 });
  await page.getByRole('button', { name: /계속하기|이어하기/ }).waitFor({ timeout: 5000 });
  await checkpoint('pause-opened');
  await page.getByRole('button', { name: /계속하기|이어하기/ }).click();
  await page.getByText('Stage 1').waitFor({ timeout: 5000 });
  await checkpoint('pause-resumed');

  await page.waitForTimeout(26000);
  const levelUpVisible = await page.getByText(/레벨 업!/).isVisible({ timeout: 1200 }).catch(() => false);
  if (levelUpVisible) {
    await page.locator('button').filter({ hasText: /해금|증가|강화|회복|관통|반경|쿨타임|피해|속도/ }).first().click({ timeout: 5000 }).catch(async () => {
      await page.locator('button').nth(2).click({ timeout: 5000 });
    });
    await checkpoint('level-up-selected');
  } else {
    await checkpoint('level-up-not-reached-after-26s');
  }

  await page.getByRole('button', { name: 'Restart' }).click({ timeout: 5000 });
  await page.getByText('Stage 1').waitFor({ timeout: 5000 });
  await checkpoint('restart-clicked');

  await page.screenshot({ path: screenshotPath, fullPage: false });
  const bodyText = await page.locator('body').innerText().catch(() => '');
  const buttons = await page.locator('button').evaluateAll((btns) =>
    btns.map((b) => b.innerText || b.getAttribute('aria-label') || b.textContent),
  );
  console.log(JSON.stringify({
    status: pageErrors.length === 0 ? 'completed' : 'completed_with_page_errors',
    url: page.url(),
    title: await page.title(),
    checkpoints,
    finalBodyText: bodyText.slice(0, 500),
    buttons,
    consoleMessages,
    pageErrors,
    screenshot: 'Quaility_Assurance/screenshots/auto-deploy-mobile-playable-loop-2026-06-24.png',
    note: 'Automated 390x844 Playwright smoke is not a replacement for real Android device/WebView QA.',
  }, null, 2));
} finally {
  await browser.close();
}
