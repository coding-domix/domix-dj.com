import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(path.resolve('output/playwright/tools/package.json'));
process.env.PLAYWRIGHT_BROWSERS_PATH = path.resolve('output/playwright/browsers');
const { chromium, firefox, webkit } = require('playwright');
const phase = process.argv[2] || 'before';
const engine = process.argv[3] || 'chromium';
const base = `http://127.0.0.1:${phase === 'before' ? 4173 : 4174}`;
const out = `output/playwright/${phase}/${engine}`;
fs.mkdirSync(out, { recursive: true });
const browser = await ({ chromium, firefox, webkit }[engine]).launch({ ...(engine === 'chromium' ? { channel: 'chrome' } : {}), headless: true });
const pages = ['index.html', 'shows.html', 'music.html', 'about.html', 'contact.html', 'legal-privacy.html'];
const widths = process.argv.includes('--interactions-only') ? [] : engine === 'chromium' ? [320, 375, 390, 430, 768, 844, 1024, 1280, 1440, 1920, 2560] : [390, 1440];
const results = { version: browser.version(), pages: [], interactions: [], errors: [] };
function monitor(page, label) {
  page.on('pageerror', e => results.errors.push({ label, type: 'exception', message: e.message }));
  page.on('console', m => { if (m.type() === 'error') results.errors.push({ label, type: 'console', message: m.text() }); });
  page.on('requestfailed', r => results.errors.push({ label, type: 'request', url: r.url(), message: r.failure()?.errorText }));
  page.on('response', r => { if (r.status() >= 400) results.errors.push({ label, type: 'http', url: r.url(), status: r.status() }); });
}
async function ready(page) {
  await page.waitForFunction(() => !document.documentElement.classList.contains('page-loading') && !document.documentElement.classList.contains('page-loader-pending'));
  await page.evaluate(() => document.fonts.ready);
}
async function settle(page) {
  await page.evaluate(async () => { await Promise.all([...document.images].filter(i => i.getClientRects().length && (i.currentSrc || i.src) && (i.complete || (i.getBoundingClientRect().top < innerHeight && i.getBoundingClientRect().bottom > 0))).map(i => i.decode().catch(() => {}))); });
  await page.waitForTimeout(350);
}
async function capture(page, name, fullPage = false) {
  if (fullPage) {
    await page.addStyleTag({ content: 'html { scroll-behavior: auto !important; }' });
    await page.mouse.move(0,0);
    for (let y=0; y<await page.evaluate(()=>document.documentElement.scrollHeight); y+=650) { await page.evaluate(y=>scrollTo(0,y),y); await page.waitForTimeout(65); }
    await page.evaluate(()=>scrollTo(0,0)); await page.waitForTimeout(800);
  }
  await settle(page);
  await page.screenshot({ path: `${out}/${name}.png`, fullPage, animations: 'disabled' });
}
async function check(name, fn) {
  try { await fn(); results.interactions.push({ name, passed: true }); }
  catch (error) { results.interactions.push({ name, passed: false, error: error.message }); }
}
try {
  for (const width of widths) {
    const height = width === 844 ? 390 : width < 768 ? 844 : 900;
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: width === 390 ? 2 : 1, isMobile: engine !== 'firefox' && width < 768, hasTouch: width < 900 });
    // Fixed time, only for repeatable date-based show visibility.
    await context.addInitScript(() => { const RealDate = Date; window.Date = class extends RealDate { constructor(...args) { super(...(args.length ? args : ['2026-10-08T10:00:00+02:00'])); } static now() { return new RealDate('2026-10-08T10:00:00+02:00').getTime(); } }; });
    for (const file of pages) {
      const page = await context.newPage(); monitor(page, `${file}@${width}`);
      await page.goto(`${base}/${file}`, { waitUntil: 'load' }); await ready(page);
      await page.waitForTimeout(250);
      const info = await page.evaluate(() => ({ title: document.title, scrollWidth: document.documentElement.scrollWidth, width: innerWidth,
        links: [...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href')),
        loader: window.DOMIX_HEADER_PRELOAD_STATUS,
        resources: performance.getEntriesByType('resource').map(r => ({ url: r.name, bytes: r.transferSize, type: r.initiatorType })),
        nav: [...document.querySelectorAll('header nav a')].map(a => ({ text: a.textContent, rect: a.getBoundingClientRect().toJSON() })) }));
      results.pages.push({ file, width, height, ...info });
      if ([390, 1440].includes(width)) {
        await capture(page, `${file}-hero-${width}`);
        await capture(page, `${file}-full-${width}`, true);
        if(file==='index.html'&&width===1440){await page.locator('header nav a[href="music.html"]').hover();await capture(page,`home-navigation-hover-${width}`);}
      }
      await page.close();
    }
    await context.close(); console.log(`${phase} ${engine}: ${width}px complete`);
  }
  for (const width of [390,1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, hasTouch: width === 390, deviceScaleFactor: width === 390 ? 2 : 1 });
    const page = await context.newPage(); monitor(page, `interactions@${width}`);
    await page.goto(`${base}/shows.html`); await ready(page);
    await check(`shows expand/collapse ${width}`, async () => {
      await page.locator('.recent-shows-toggle').click(); assert.equal(await page.locator('.recent-show-extra[hidden]').count(),0);
      await capture(page, `shows-expanded-${width}`,true);
      await page.locator('.recent-shows-toggle').click(); assert.ok(await page.locator('.recent-show-extra[hidden]').count()>0);
    });
    await check(`gallery controls and keyboard ${width}`, async () => {
      const trigger = page.locator('[data-gallery]').first(); await trigger.click();
      const img = page.locator('.show-lightbox-image'); const first = await img.getAttribute('src');
      await capture(page, `gallery-open-${width}`);
      await page.keyboard.press('ArrowRight'); assert.notEqual(await img.getAttribute('src'), first);
      await page.keyboard.press('ArrowLeft'); assert.equal(await img.getAttribute('src'), first);
      await page.locator('.show-lightbox-preview').first().click({ position: { x: 20, y: 20 }, timeout: 3000 });
      await capture(page, `gallery-preview-${width}`);
      await page.keyboard.press('Escape'); assert.equal(await page.locator('#show-lightbox').getAttribute('aria-hidden'),'true');
    });
    await page.keyboard.press('Escape');
    await check(`gallery close keyboard ${width}`, async () => { await page.locator('[data-gallery]').first().click(); await page.locator('.show-lightbox-close').focus(); await page.keyboard.press('Enter'); assert.equal(await page.locator('#show-lightbox').getAttribute('aria-hidden'),'true'); });
    await page.keyboard.press('Escape');
    await page.goto(`${base}/music.html`); await ready(page);
    await check(`music search and toggle ${width}`, async () => {
      const count = await page.locator('[data-remix-id]').count(); await page.locator('#remixes-toggle').click(); assert.ok(await page.locator('[data-remix-id]').count()>count);
      await capture(page, `music-expanded-${width}`,true);
      await page.locator('#music-search').fill('zzzznomatch'); assert.equal(await page.locator('[data-remix-id]').count(),0);
      await capture(page, `music-search-empty-${width}`,true);
      await page.locator('#music-search').fill(''); await page.locator('#remixes-toggle').click();
    });
    await check(`featured audio play/pause/seek ${width}`, async () => {
      await page.locator('.music-featured-listen').click(); await page.waitForFunction(() => !featuredPreviewAudio.paused && featuredPreviewAudio.currentTime > 0);
      await page.locator('.music-featured-listen').click(); assert.equal(await page.evaluate(() => featuredPreviewAudio.paused),true);
      await page.locator('.music-waveform[role=slider]').focus(); await page.keyboard.press('ArrowRight'); assert.ok(await page.evaluate(() => featuredPreviewAudio.currentTime)>4);
    });
    await check(`remix audio play/pause ${width}`, async () => {
      await page.locator('.music-track-listen').first().click(); await page.waitForFunction(() => !remixPreviewAudio.paused && remixPreviewAudio.currentTime > 0);
      assert.equal(await page.evaluate(() => featuredPreviewAudio.paused),true);
      await page.locator('.music-track-listen').first().click(); assert.equal(await page.evaluate(() => remixPreviewAudio.paused),true);
    });
    await page.goto(`${base}/index_mobil.html?audit=1#played-at`); await ready(page);
    await check(`legacy redirect ${width}`, async () => assert.ok(page.url().endsWith('index.html?audit=1#played-at')));
    await check(`navigation ${width}`, async () => { await page.evaluate(()=>scrollTo({top:0,behavior:'instant'})); await page.waitForTimeout(300); await page.locator('header nav a[href="contact.html"]').click(); await ready(page); assert.ok(page.url().endsWith('/contact.html')); await page.reload(); await ready(page); });
    await context.close();
  }
} finally { fs.writeFileSync(`${out}/${process.argv.includes('--interactions-only')?'interaction-results':'results'}.json`, JSON.stringify(results,null,2)); await browser.close(); }
console.log(JSON.stringify({ pages: results.pages.length, checks: results.interactions, errors: results.errors },null,2));
