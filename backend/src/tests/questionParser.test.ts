import { parseQuestions } from '../services/questionParser';

const testInput = process.argv[2]
  || '1. 若复数 z = (1 + i)^2，则 z 的模为____。\n\n2. 已知直线 l 过点 (1, 2)，斜率为 3，则其方程为____。\nA. y = 3x - 1\nB. y = 3x + 1\nC. y = 3x - 2\nD. y = 3x + 2\n\n3. 判断：函数 f(x) = x^2 在 R 上单调递增。';

async function testParseQuestions() {
  console.log('Testing questionParser service...\n');
  console.log('Input text:');
  console.log(testInput);
  console.log('\n---\n');

  try {
    const questions = await parseQuestions(testInput);

    console.log(`Parsed ${questions.length} question(s):\n`);

    let passed = true;

    for (const q of questions) {
      console.log(`  [${q.index}] ID="${q.id}" Text="${q.text.substring(0, 50)}..."`);

      if (!q.id || typeof q.id !== 'string') {
        console.error('  FAIL: id should be a string');
        passed = false;
      }

      if (typeof q.text !== 'string' || q.text.trim().length === 0) {
        console.error('  FAIL: text should be a non-empty string');
        passed = false;
      }

      if (typeof q.index !== 'number' || isNaN(q.index)) {
        console.error('  FAIL: index should be a number');
        passed = false;
      }

      if (!/^\d+$/.test(q.id)) {
        console.error(`  FAIL: id "${q.id}" should be a numeric string`);
        passed = false;
      }
    }

    console.log('\n---\n');
    console.log(passed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED');
    process.exit(passed ? 0 : 1);

  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

testParseQuestions();
