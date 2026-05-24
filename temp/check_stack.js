const fs = require('fs');
const lines = fs.readFileSync('C:\\Users\\64887\\ocr-kb-matcher\\frontend\\components\\navigation\\Navigation.tsx', 'utf8').split('\n');
let stack = [];
for (let i = 0; i < lines.length; i++) {
  const l = lines[i];
  const stripped = l.trimStart();
  const selfClose = stripped.match(/^<(div|form)(?:\s[^>]*)?\/>$/);
  if (selfClose) continue;
  const openTag = stripped.match(/^<(div|React\.Fragment|form|button|Link|span)(?:\s|>|<\/)/);
  if (openTag && !stripped.startsWith('</') && !stripped.endsWith('/>')) stack.push({ i: i + 1, tag: openTag[1] });
  const closeTag = stripped.match(/^<\/(div|React\.Fragment|form|button|Link|span)>/);
  if (closeTag) stack.pop();
}
console.log('Unclosed:', JSON.stringify(stack));
