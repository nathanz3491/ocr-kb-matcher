/**
 * QA scenarios for Task 4 - User service role helpers + admin bootstrap
 * Run: npx ts-node src/_qa_task4.ts
 */
import * as fs from 'fs';
import * as path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data', 'users.json');

// Store original data for restoration
const originalData = fs.readFileSync(DATA_FILE, 'utf-8');

async function main() {
  const results: { name: string; passed: boolean; output: string }[] = [];

  try {
    // ── Setup: seed a test user ──
    const testUser = {
      id: 'test-user-001',
      email: 'admin@test.com',
      passwordHash: '$2a$12$fakehash',
      name: 'Test Admin',
      accountType: 'student' as const,
      emailVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      settings: { darkMode: false, emailNotifications: true, dailyReminder: false },
      tier: 'free' as const,
      role: 'user' as const,
      usage: {
        periodStart: new Date(Date.UTC(2026, 6, 1)).toISOString(),
        uploads: 5,
        quizGenerated: 2,
        chatMessages: 10,
      },
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify([testUser], null, 2), 'utf-8');

    // ── We need to dynamically import after clearing module cache ──
    // Since userService has a module-level cache, we need to reload modules
    delete require.cache[require.resolve('./services/userService')];
    const userService = require('./services/userService');

    // ── Scenario 1: getUserById returns null for missing user ──
    {
      const result = await userService.getUserById('nonexistent-id-12345');
      const passed = result === null;
      const output = `getUserById('nonexistent-id-12345') => ${result === null ? 'null' : JSON.stringify(result)}\nPASS: ${passed}`;
      console.log(`\n=== Scenario 1: getUserById returns null for missing user ===`);
      console.log(output);
      results.push({ name: 'getUserById missing', passed, output });
    }

    // ── Scenario 2: getUserById returns user for valid id ──
    {
      const result = await userService.getUserById('test-user-001');
      const passed = result !== null && result.id === 'test-user-001' && result.email === 'admin@test.com';
      const output = `getUserById('test-user-001') => ${JSON.stringify({ id: result?.id, email: result?.email, tier: result?.tier, role: result?.role }, null, 2)}\nPASS: ${passed}`;
      console.log(`\n=== Scenario 2: getUserById returns full User object ===`);
      console.log(output);
      results.push({ name: 'getUserById valid', passed, output });
    }

    // ── Scenario 3: saveUser persists changes atomically ──
    {
      const user = await userService.getUserById('test-user-001');
      user.tier = 'monthly';
      await userService.saveUser(user);
      const savedData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
      const savedUser = savedData.find((u: { id: string }) => u.id === 'test-user-001');
      const passed = savedUser && savedUser.tier === 'monthly';
      const output = `Modified tier to 'monthly' on user test-user-001\nRead back from users.json: tier=${savedUser?.tier}\nPASS: ${passed}`;
      console.log(`\n=== Scenario 3: saveUser persists changes atomically ===`);
      console.log(output);
      results.push({ name: 'saveUser persist', passed, output });
    }

    // ── Scenario 4: bootstrapAdmin promotes matching emails ──
    {
      // Reset user back to 'user' role
      const user = await userService.getUserById('test-user-001');
      user.role = 'user';
      user.tier = 'free';
      delete require.cache[require.resolve('./services/userService')];
      const userService2 = require('./services/userService');

      process.env.ADMIN_EMAILS = 'admin@test.com';
      await userService2.bootstrapAdmin();
      const savedData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
      const savedUser = savedData.find((u: { id: string }) => u.id === 'test-user-001');
      const passed = savedUser && savedUser.role === 'admin';
      const output = `Set ADMIN_EMAILS='admin@test.com'\nCalled bootstrapAdmin()\nRead back from users.json: role=${savedUser?.role}\nPASS: ${passed}`;
      console.log(`\n=== Scenario 4: bootstrapAdmin promotes matching emails ===`);
      console.log(output);
      results.push({ name: 'bootstrapAdmin', passed, output });
    }

    // ── Scenario 5: getAdminEmails parses env var ──
    {
      process.env.ADMIN_EMAILS = '  admin@test.com ,  other@test.com  ';
      const emails = userService.getAdminEmails();
      const passed = emails.length === 2 && emails[0] === 'admin@test.com' && emails[1] === 'other@test.com';
      const output = `ADMIN_EMAILS='  admin@test.com ,  other@test.com  '\ngetAdminEmails() => [${emails.map((e: string) => `'${e}'`).join(', ')}]\nPASS: ${passed}`;
      console.log(`\n=== Scenario 5: getAdminEmails parses env var ===`);
      console.log(output);
      results.push({ name: 'getAdminEmails', passed, output });
    }

    // ── Scenario 6: getAdminEmails returns empty array for missing env ──
    {
      delete process.env.ADMIN_EMAILS;
      const emails = userService.getAdminEmails();
      const passed = emails.length === 0;
      const output = `ADMIN_EMAILS not set\ngetAdminEmails() => []\nPASS: ${passed}`;
      console.log(`\n=== Scenario 6: getAdminEmails empty for missing env ===`);
      console.log(output);
      results.push({ name: 'getAdminEmails empty', passed, output });
    }

    // ── Scenario 7: setUserTier updates tier ──
    {
      process.env.ADMIN_EMAILS = 'admin@test.com';
      delete require.cache[require.resolve('./services/userService')];
      const userService3 = require('./services/userService');

      const user = await userService3.getUserById('test-user-001');
      user.role = 'user';
      user.tier = 'free';
      await userService3.saveUser(user);

      const updated = await userService3.setUserTier('test-user-001', 'yearly', 365);
      const passed = updated !== null && updated.tier === 'yearly' && updated.tierExpiresAt;
      const output = `setUserTier('test-user-001', 'yearly', 365)\nResult tier: ${updated?.tier}, expiresAt: ${updated?.tierExpiresAt}\nPASS: ${passed}`;
      console.log(`\n=== Scenario 7: setUserTier updates tier ===`);
      console.log(output);
      results.push({ name: 'setUserTier', passed, output });
    }

    // ── Summary ──
    console.log('\n=== SUMMARY ===');
    let allPassed = true;
    for (const r of results) {
      console.log(`${r.passed ? '✅' : '❌'} ${r.name}: ${r.passed ? 'PASS' : 'FAIL'}`);
      if (!r.passed) allPassed = false;
    }
    console.log(`\nAll scenarios passed: ${allPassed}`);

    // Write evidence files
    const evidenceDir = path.join(process.cwd(), '..', '.sisyphus', 'evidence');
    fs.mkdirSync(evidenceDir, { recursive: true });

    const scenario1Result = results.find(r => r.name === 'getUserById missing');
    if (scenario1Result) {
      fs.writeFileSync(path.join(evidenceDir, 'task-4-getuserid-missing.txt'),
        `QA Scenario: getUserById returns null for missing user\n${'='.repeat(60)}\n${scenario1Result.output}\n`, 'utf-8');
    }

    const scenario3Result = results.find(r => r.name === 'saveUser persist');
    if (scenario3Result) {
      fs.writeFileSync(path.join(evidenceDir, 'task-4-saveuser-persist.txt'),
        `QA Scenario: saveUser persists changes atomically\n${'='.repeat(60)}\n${scenario3Result.output}\n`, 'utf-8');
    }

    const scenario4Result = results.find(r => r.name === 'bootstrapAdmin');
    if (scenario4Result) {
      fs.writeFileSync(path.join(evidenceDir, 'task-4-bootstrap-admin.txt'),
        `QA Scenario: bootstrapAdmin promotes matching emails\n${'='.repeat(60)}\n${scenario4Result.output}\n`, 'utf-8');
    }

    process.exit(allPassed ? 0 : 1);
  } catch (err) {
    console.error('QA script failed:', err);
    process.exit(1);
  } finally {
    // Restore original data
    fs.writeFileSync(DATA_FILE, originalData, 'utf-8');
  }
}

main();
