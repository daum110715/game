import re

html_files = [
    'index.html',
    'games/2048/index.html',
    'games/freecell/index.html',
    'games/klondike/index.html',
    'games/minesweeper/index.html',
    'games/spider/index.html',
    'games/sudoku/index.html',
]

issues = []

for f in html_files:
    with open(f, 'r', encoding='utf-8') as fh:
        text = fh.read()
    
    # Check for U+FFFD replacement character
    if '\ufffd' in text:
        count = text.count('\ufffd')
        issues.append(f'{f}: {count} U+FFFD replacement chars')
    
    # Check button tag balance
    open_b = text.count('<button')
    close_b = text.count('</button>')
    if open_b != close_b:
        issues.append(f'{f}: button tags mismatch (open={open_b}, close={close_b})')
    
    # Check for damaged closing tags
    if '?/div>' in text:
        issues.append(f'{f}: damaged </div> tags')
    if '?/span>' in text:
        issues.append(f'{f}: damaged </span> tags')
    if '/button>' in text and '</button>' not in text:
        issues.append(f'{f}: damaged </button> tags')

# Check CSS braces
with open('styles/common.css', 'r', encoding='utf-8') as f:
    css = f.read()
open_b = css.count('{')
close_b = css.count('}')
if open_b != close_b:
    issues.append(f'common.css: brace mismatch ({open_b} vs {close_b})')

# Check theme.js
with open('scripts/theme.js', 'r', encoding='utf-8') as f:
    js = f.read()
if "'clay'" not in js:
    issues.append('theme.js: missing clay theme')
if "'forest'" in js:
    issues.append('theme.js: still has old forest theme')

if issues:
    print('ISSUES:')
    for i in issues:
        print('  -', i)
else:
    print('All checks passed!')
