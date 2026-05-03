import sys
filepath = sys.argv[1]
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace('\\\\\\.tmp.\\\\\\.', '.tmp.')
with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print(f'Fixed: {filepath}')
