const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://cells-retreat-estimates-intellectual.trycloudflare.com', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(2000);
  await page.locator('button').first().click();
  await page.waitForTimeout(500);

  // Check computed styles of overlay and header
  const styles = await page.evaluate(() => {
    // Find by position+class pattern
    const allFixed = document.querySelectorAll('[style*="position: fixed"], [style*="position:fixed"]');
    const fixedEls = Array.from(document.querySelectorAll('[class*="fixed"]'));

    const overlay = fixedEls.find(el => el.className.includes('99990'));
    const header = fixedEls.find(el => el.className.includes('99998'));

    const getStyle = (el) => {
      if (!el) return null;
      const cs = window.getComputedStyle(el);
      return {
        class: el.className.slice(0, 80),
        zIndex: cs.zIndex,
        transform: cs.transform,
        pointerEvents: cs.pointerEvents,
        position: cs.position,
        opacity: cs.opacity,
        visibility: cs.visibility,
      };
    };

    return {
      overlay: getStyle(overlay),
      header: getStyle(header),
      fixedCount: fixedEls.length
    };
  });
  console.log('styles:', JSON.stringify(styles, null, 2));

  // What is on top at toggle center?
  const toggleRect = await page.evaluate(() => {
    const btns = document.querySelectorAll('button');
    for (const b of btns) {
      if (b.title && b.title.includes('dark')) {
        const r = b.getBoundingClientRect();
        return { x: r.x + r.width/2, y: r.y + r.height/2 };
      }
    }
  });

  if (toggleRect) {
    const topEl = await page.evaluate(({x, y}) => {
      const el = document.elementFromPoint(x, y);
      const cs = window.getComputedStyle(el);
      return {
        tag: el.tagName,
        cls: el.className.slice(0,100),
        zIndex: cs.zIndex,
        pointerEvents: cs.pointerEvents,
        transform: cs.transform,
        html: el.outerHTML.slice(0, 150)
      };
    }, toggleRect);
    console.log('top element at toggle center:', JSON.stringify(topEl, null, 2));
  }

  await browser.close();
})().catch(e => console.error('FATAL:', e.message));
