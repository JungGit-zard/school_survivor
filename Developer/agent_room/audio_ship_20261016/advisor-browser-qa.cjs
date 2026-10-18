// Run only after integration owner releases the browser slot and reserve guard passes.
const { createRequire } = require('node:module');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const req = createRequire(path.resolve(__dirname, '../../r3f_prototype/package.json'));
const { chromium } = req('playwright');

(async () => {
  const report = { startedAt: new Date().toISOString(), url: process.env.AUDIO_QA_URL || 'http://localhost:5173/sfx-audition-20261016.html', played: [], errors: [], closed: false };
  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    const cdp = await browser.newBrowserCDPSession();
    report.browserPid = (await cdp.send('SystemInfo.getProcessInfo')).processInfo.find(p => p.type === 'browser')?.id;
    const page = await browser.newPage({ viewport: { width: 1365, height: 900 } });
    page.on('pageerror', e => report.errors.push(String(e)));
    await page.addInitScript(() => {
      window.__auditionAudit = { calls: 0, elements: [], results: [] };
      const realPlay = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function (...args) {
        const audit = window.__auditionAudit;
        audit.calls++;
        if (!audit.elements.includes(this)) audit.elements.push(this);
        const src = this.src;
        return realPlay.apply(this, args).then(value => {
          audit.results.push({ src, ok: true });
          return value;
        }, error => {
          audit.results.push({ src, ok: false, error: String(error) });
          throw error;
        });
      };
    });
    await page.goto(report.url, { waitUntil: 'load' });
    assert.equal(await page.locator('.case-card').count(), 93);
    assert.equal(await page.evaluate(() => window.__auditionAudit.calls), 0, 'no autoplay');
    await page.screenshot({ path: path.join(__dirname, 'audition-desktop-verified.png') });
    const cases = await page.evaluate(() => window.SFX_AUDITION_MANIFEST.cases.map(c => ({ id: c.id, category: c.category })));
    for (const item of cases) {
      // Filtering keeps every control in view and exercises the real search handler.
      await page.locator('#search').fill(item.id);
      for (const variant of ['original', 'A', 'B', 'C']) {
        const before = await page.evaluate(() => window.__auditionAudit.results.length);
        await page.locator(`[data-case="${item.id}"][data-play="${variant}"]`).click();
        await page.waitForFunction(n => window.__auditionAudit.results.length > n, before, { timeout: 15000 });
        const result = await page.evaluate(() => window.__auditionAudit.results.at(-1));
        assert.equal(result.ok, true, `${item.id}/${variant}: ${result.error}`);
        assert.equal(await page.evaluate(() => window.__auditionAudit.elements.filter(a => !a.paused && !a.ended).length) <= 1, true);
        await page.locator('#stop-all').click();
        assert.equal(await page.evaluate(() => window.__auditionAudit.elements.filter(a => !a.paused).length), 0);
        report.played.push({ id: item.id, variant, ...result });
      }
    }
    await page.locator('#search').fill('dialogue-matilda');
    await page.locator('[data-case="dialogue-matilda"][data-play="A"]').click();
    await page.locator('[data-case="dialogue-matilda"][data-play="B"]').click();
    await page.locator('#stop-all').click();
    await page.waitForTimeout(150);
    assert.equal(await page.evaluate(() => window.__auditionAudit.elements.filter(a => !a.paused).length), 0);
    await page.locator('[data-case="dialogue-matilda"][data-prefer="C"]').click();
    assert.equal(await page.locator('[data-case="dialogue-matilda"][data-prefer="C"]').getAttribute('aria-pressed'), 'true');
    const downloadPromise = page.waitForEvent('download');
    await page.locator('#export').click();
    const download = await downloadPromise;
    report.preferenceDownload = download.suggestedFilename();
    const stream = await download.createReadStream();
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    report.preferenceData = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    assert.deepEqual(report.preferenceData.choices.map(c => [c.caseId, c.selected]), [['dialogue-matilda', 'C']]);
    await page.locator('#search').fill('');
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, 'mobile horizontal overflow');
    await page.screenshot({ path: path.join(__dirname, 'audition-mobile-verified.png') });
    await page.reload({ waitUntil: 'load' });
    assert.equal(await page.locator('[data-prefer][aria-pressed="true"]').count(), 0, 'preferences must not persist');
    assert.equal(report.played.length, 372);
    assert.deepEqual(report.errors, []);
    report.passed = true;
  } catch (error) {
    report.passed = false;
    report.failure = String(error.stack || error);
    process.exitCode = 1;
  } finally {
    if (browser) { await browser.close(); report.closed = true; }
    report.finishedAt = new Date().toISOString();
    fs.writeFileSync(path.join(__dirname, 'advisor-browser-qa.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify({ passed: report.passed, played: report.played.length, browserPid: report.browserPid, closed: report.closed, failure: report.failure }));
  }
})();
