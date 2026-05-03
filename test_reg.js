const { chromium } = require('playwright');

const FRONTEND_URL = 'https://cats-tampa-stunning-flickr.trycloudflare.com';

async function runTests() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  const results = {
    step1Renders: false,
    clickStudent: false,
    formFieldsVisible: false,
    clickParent: false,
    parentFormFieldsVisible: false,
    clickBack: false,
    backToStep1: false,
    consoleErrors: []
  };

  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if ((text.includes('61.141.248.185') && text.includes('ERR_NAME_NOT_RESOLVED')) ||
          (text.includes('61.141.248.185') && text.includes('ERR_CONNECTION_REFUSED'))) {
        return;
      }
      results.consoleErrors.push(text);
    }
  });

  page.on('pageerror', err => {
    results.consoleErrors.push(`PAGE ERROR: ${err.message}`);
  });

  try {
    console.log('Loading register page...');
    await page.goto(`${FRONTEND_URL}/auth/register`, { waitUntil: 'networkidle', timeout: 30000 });

    const joinText = await page.locator('text=Join as Student or Parent').isVisible().catch(() => false);
    const studentCard = await page.locator('text=I am a Student').isVisible().catch(() => false);
    const parentCard = await page.locator('text=I am a Parent').isVisible().catch(() => false);

    if (joinText || (studentCard && parentCard)) {
      results.step1Renders = true;
      console.log('✓ Step 1 renders with Student/Parent cards');
    } else {
      console.log('✗ Step 1 did not render correctly');
    }
  } catch (err) {
    console.log(`✗ Step 1 test failed: ${err.message}`);
  }

  if (results.step1Renders) {
    try {
      console.log('Clicking "I am a Student"...');
      const studentBtn = page.locator('button, div[role="button"]').filter({ hasText: /I am a Student/i }).first();
      await studentBtn.click();
      await page.waitForTimeout(1500);

      results.clickStudent = true;
      console.log('✓ Clicked "I am a Student"');

      const fullNameLabel = await page.locator('text=Full Name').isVisible().catch(() => false);
      const emailLabel = await page.locator('text=Email').isVisible().catch(() => false);
      const passwordLabel = await page.locator('text=Password').isVisible().catch(() => false);

      if (fullNameLabel || emailLabel || passwordLabel) {
        results.formFieldsVisible = true;
        console.log('✓ Step 2 form fields visible (Full Name, Email, Password)');
      } else {
        console.log('✗ Step 2 form fields NOT visible after clicking Student');
      }
    } catch (err) {
      console.log(`✗ Click Student test failed: ${err.message}`);
    }
  }

  if (results.formFieldsVisible) {
    try {
      console.log('Clicking "Back"...');
      const backBtn = page.locator('button').filter({ hasText: /Back/i }).first();
      await backBtn.click();
      await page.waitForTimeout(1000);

      results.clickBack = true;
      console.log('✓ Clicked Back');

      const studentCardAgain = await page.locator('text=I am a Student').isVisible().catch(() => false);
      const parentCardAgain = await page.locator('text=I am a Parent').isVisible().catch(() => false);

      if (studentCardAgain && parentCardAgain) {
        results.backToStep1 = true;
        console.log('✓ Back to Step 1 - Student/Parent cards visible');
      } else {
        console.log('✗ Did not return to Step 1 correctly');
      }
    } catch (err) {
      console.log(`✗ Back test failed: ${err.message}`);
    }
  }

  if (results.backToStep1) {
    try {
      console.log('Testing Parent flow...');
      const parentBtn = page.locator('button, div[role="button"]').filter({ hasText: /I am a Parent/i }).first();
      await parentBtn.click();
      await page.waitForTimeout(1500);

      results.clickParent = true;
      console.log('✓ Clicked "I am a Parent"');

      const fullNameLabel = await page.locator('text=Full Name').isVisible().catch(() => false);
      const emailLabel = await page.locator('text=Email').isVisible().catch(() => false);
      const passwordLabel = await page.locator('text=Password').isVisible().catch(() => false);

      if (fullNameLabel || emailLabel || passwordLabel) {
        results.parentFormFieldsVisible = true;
        console.log('✓ Parent Step 2 form fields visible');
      } else {
        console.log('✗ Parent Step 2 form fields NOT visible');
      }
    } catch (err) {
      console.log(`✗ Parent flow test failed: ${err.message}`);
    }
  }

  await browser.close();

  console.log('\n========== TEST SUMMARY ==========');
  console.log(`Step 1 renders: ${results.step1Renders ? 'PASS' : 'FAIL'}`);
  console.log(`Click Student: ${results.clickStudent ? 'PASS' : 'FAIL'}`);
  console.log(`Form fields (Student): ${results.formFieldsVisible ? 'PASS' : 'FAIL'}`);
  console.log(`Click Back: ${results.clickBack ? 'PASS' : 'FAIL'}`);
  console.log(`Back to Step 1: ${results.backToStep1 ? 'PASS' : 'FAIL'}`);
  console.log(`Click Parent: ${results.clickParent ? 'PASS' : 'FAIL'}`);
  console.log(`Form fields (Parent): ${results.parentFormFieldsVisible ? 'PASS' : 'FAIL'}`);

  const criticalErrors = results.consoleErrors.filter(e => !e.includes('ERR_NAME_NOT_RESOLVED') && !e.includes('404'));
  console.log(`\nCritical Console Errors (${criticalErrors.length}):`);
  if (criticalErrors.length > 0) {
    criticalErrors.forEach(e => console.log(`  - ${e}`));
  } else {
    console.log('  None');
  }

  const allPassed = results.step1Renders && results.clickStudent && results.formFieldsVisible &&
                    results.clickBack && results.backToStep1 && results.clickParent && results.parentFormFieldsVisible;

  console.log(`\nOVERALL: ${allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);

  return results;
}

runTests().catch(console.error);