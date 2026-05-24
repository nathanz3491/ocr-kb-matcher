#!/bin/bash
export PATH=/home/nathan/.nvm/versions/node/v20.20.2/bin:$PATH
FILE="/home/nathan/ocr-kb-matcher/frontend/components/navigation/Navigation.tsx"
python3 -c "
with open('$FILE', 'r', encoding='utf-8') as f: content = f.read()
if '<div className=\"navigation-wrapper\">' not in content:
    content = content.replace('    <>\n', '    <div className=\"navigation-wrapper\">\n', 1)
    content = content.replace('\n    </>\n  );\n', '\n    </div>\n  );\n')
    with open('$FILE', 'w', encoding='utf-8') as f: f.write(content)
    print('Fixed')
else:
    print('Already fixed')
"
