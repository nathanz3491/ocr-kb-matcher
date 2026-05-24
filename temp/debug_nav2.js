const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://cells-retreat-estimates-intellectual.trycloudflare.com', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(2000);

  // Open nav
  await page.locator('button').first().click();
  await page.waitForTimeout(500);

  // Find toggle button
  const toggleBtn = page.locator('button[title*="dark"], button[title*="Switch"]');
  const btnCount = await toggleBtn.count();
  console.log('toggle btn count:', btnCount);

  if (btnCount > 0) {
    // Get its position
    const box = await toggleBtn.boundingBox();
    console.log('toggle bbox:', box);

    // Use Playwright's click (not raw mouse.click) - it uses dispatchEvent
    await toggleBtn.click({ force: false });
    await page.waitForTimeout(500);

    // Check if nav is still open
    const navOpen = await page.evaluate(() => {
      const els = document.querySelectorAll('[class*="fixed"]');
      for (const el of els) {
        if (el.className.includes('translate-y-0') && el.className.includes('inset-x-0')) return true;
      }
      return false;
    });
    console.log('nav still open after playwright click:', navOpen);

    // Try click with force
    await page.locator('button').first().click();
    await page.waitForTimeout(300);

    // Click using locator with force
    await toggleBtn.click({ force: true });
    await page.waitForTimeout(500);
    const navOpen2 = await page.evaluate(() => {
      const els = document.querySelectorAll('[class*="fixed"]');
      for (const el of els) {
        if (el.className.includes('translate-y-0') && el.className.includes('inset-x-0')) return true;
      }
      return false;
    });
    console.log('nav open after force click:', navOpen2);
  }

  // Let's check the exact bounding box of header vs toggle
  const positions = await page.evaluate(() => {
    const btns = document.querySelectorAll('button');
    const toggle = Array.from(btns).find(b => b.title?.includes('dark'));
    const header = Array.from(document.querySelectorAll('[class*="fixed"]')).find(el => el.className.includes('99998'));
    const overlay = Array.from(document.querySelectorAll('[class*="fixed"]')).find(el => el.className.includes('99990'));

    const getRect = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height, right: r.right, bottom: r.bottom };
    };

    return {
      toggle: toggle ? { rect: getRect(toggle), visible: toggle.offsetParent !== null } : null,
      header: getRect(header),
      overlay: getRect(overlay)
    };
  });
  console.log('positions:', JSON.stringify(positions, null, 2));

  await browser.close();
})().catch(e => console.error('FATAL:', e.message));
