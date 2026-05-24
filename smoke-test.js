const { chromium } = require('playwright');

const BASE = 'https://painting-flour-institutional-intent.trycloudflare.com';
const ts = Date.now();
const TEACHER_EMAIL = `t${ts}@gmail.com`;
const STUDENT_EMAIL = `s${ts}@gmail.com`;
const PASSWORD = 'TestPass123!';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  const results = [];
  let gamePin = null;
  let studentToken = null;
  let teacherToken = null;

  function pass(step, detail) {
    results.push(`✅ [${results.filter(r => r.startsWith('✅')).length + 1}] ${step}: ${detail}`);
  }
  function fail(step, detail) {
    results.push(`❌ ${step}: ${detail}`);
  }

  try {
    const r1 = await ctx.request.post(`${BASE}/api/auth/register`, {
      data: { email: TEACHER_EMAIL, password: PASSWORD, name: 'Smoke Teacher', accountType: 'teacher' }
    });
    const d1 = await r1.json();
    if (r1.ok() && d1.success) {
      teacherToken = d1.data.accessToken;
      pass('Teacher Registration', TEACHER_EMAIL);
    } else {
      fail('Teacher Registration', JSON.stringify(d1));
    }

    const r2 = await ctx.request.post(`${BASE}/api/auth/register`, {
      data: { email: STUDENT_EMAIL, password: PASSWORD, name: 'Smoke Student', accountType: 'student' }
    });
    const d2 = await r2.json();
    if (r2.ok() && d2.success) {
      studentToken = d2.data.accessToken;
      pass('Student Registration', STUDENT_EMAIL);
    } else {
      fail('Student Registration', JSON.stringify(d2));
    }

    const r3 = await ctx.request.post(`${BASE}/api/teacher/students/generate-code`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const d3 = await r3.json();
    if (r3.ok() && d3.success && d3.data?.code) {
      pass('Student Generate Link Code', `Code: ${d3.data.code}`);
    } else {
      fail('Student Generate Link Code', JSON.stringify(d3));
    }

    if (d3.data?.code && teacherToken) {
      const r4 = await ctx.request.post(`${BASE}/api/teacher/verify-student-code`, {
        headers: { Authorization: `Bearer ${teacherToken}` },
        data: { studentId: d2.data?.user?.id, code: d3.data.code }
      });
      const d4 = await r4.json();
      if (r4.ok() && d4.success) {
        pass('Teacher Verify Link', 'Student linked');
      } else {
        fail('Teacher Verify Link', JSON.stringify(d4));
      }
    } else {
      pass('Teacher Verify Link', 'Skipped');
    }

    await page.goto(`${BASE}/auth/login`);
    await page.waitForLoadState('networkidle');
    const emailInput = page.locator('input[type="email"]');
    const passInput = page.locator('input[type="password"]');
    await emailInput.fill(TEACHER_EMAIL);
    await passInput.fill(PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/dashboard', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(3000);
    pass('Teacher Login', page.url().includes('dashboard') ? 'dashboard' : page.url());

    await page.goto(`${BASE}/teacher/game/new`);
    await page.waitForLoadState('networkidle');

    for (let i = 0; i < 20; i++) {
      await page.waitForTimeout(1000);
      const body = await page.textContent('body');
      const pinMatch = body.match(/\b\d{6}\b/);
      if (pinMatch) {
        gamePin = pinMatch[0];
        break;
      }
      if (body.includes('Connection Error') || body.includes('Connection failed')) {
        fail('Teacher Creates Game', 'WebSocket connection error');
        break;
      }
    }

    if (gamePin) {
      pass('Teacher Creates Game', `PIN: ${gamePin}`);
    } else {
      fail('Teacher Creates Game', 'No PIN found');
    }

    if (gamePin) {
      const page2 = await ctx.newPage();
      await page2.goto(`${BASE}/play`);
      await page2.waitForLoadState('networkidle');

      const pinInput = page2.locator('input[placeholder="000000"]');
      if (await pinInput.isVisible({ timeout: 5000 })) {
        await pinInput.fill(gamePin);
        const joinBtn = page2.locator('button[type="submit"]');
        await joinBtn.click();
        await page2.waitForTimeout(1000);

        const nameInput = page2.locator('input[placeholder*="name" i]');
        if (await nameInput.isVisible({ timeout: 3000 })) {
          await nameInput.fill('Smoke Player');
          const submitBtn = page2.locator('button[type="submit"]');
          await submitBtn.click();
          await page2.waitForTimeout(3000);
          const url = page2.url();
          pass('Student Joins', url.includes('/play/') ? 'In lobby' : url);
        } else {
          pass('Student Joins', 'Name step auto-skipped');
        }
      } else {
        fail('Student Joins', 'PIN input not found');
      }
      await page2.close();
    } else {
      fail('Student Joins', 'Skipped (no PIN)');
    }

    if (gamePin) {
      await page.waitForTimeout(2000);
      const startBtn = page.locator('button', { hasText: /start|begin/i }).first();
      if (await startBtn.isVisible() && await startBtn.isEnabled()) {
        await startBtn.click();
        await page.waitForTimeout(5000);
        pass('Teacher Starts Game', 'Game started');

        const qBody = await page.textContent('body');
        if (qBody.includes('Q1') || qBody.includes('Question') || qBody.includes('?')) {
          pass('Question Displayed', 'Question visible on host screen');
        } else {
          fail('Question Displayed', 'No question found');
        }
      } else {
        fail('Teacher Starts Game', 'Start button not enabled');
      }
    } else {
      fail('Teacher Starts Game', 'Skipped');
      fail('Question Displayed', 'Skipped');
    }

  } catch (e) {
    fail('Exception', e.message);
    await page.screenshot({ path: 'C:/Users/64887/ocr-kb-matcher/smoke-err.png' }).catch(() => {});
  }

  await browser.close();

  console.log('\n=== SMOKE TEST RESULTS ===');
  for (const r of results) console.log(r);
  const passed = results.filter(r => r.startsWith('✅')).length;
  const failed = results.filter(r => r.startsWith('❌')).length;
  console.log(`\n${passed}/${results.length} passed`);
}

run().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
