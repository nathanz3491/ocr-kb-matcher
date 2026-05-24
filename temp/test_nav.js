const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://cells-retreat-estimates-intellectual.trycloudflare.com', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(2000);

  await page.locator('button').first().click();
  await page.waitForTimeout(800);

  const toggleBtn = page.locator('button[title*="dark"], button[title*="Switch"]');
  const tbCount = await toggleBtn.count();
  console.log('toggle button found:', tbCount > 0);

  if (tbCount > 0) {
    const box = await toggleBtn.boundingBox();
    console.log('toggle coords:', box);
    await toggleBtn.click({ force: true });
    await page.waitForTimeout(800);

    const navOpen = await page.evaluate(() => {
      const els = document.querySelectorAll('[class*="fixed"]');
      for (const el of els) {
        if (el.className.includes('translate-y-0') && el.className.includes('inset-x-0')) return true;
      }
      return false;
    });
    console.log('nav still open after toggle click:', navOpen);
  }

  await browser.close();
})().catch(e => console.error('FATAL:', e.message));
