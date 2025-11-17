from pathlib import Path
text = Path('src/App.tsx').read_text(encoding='utf-8')
positions = [27893, 64351]
for pos in positions:
    prefix = text[:pos]
    line = prefix.count('\n')+1
    col = pos - (prefix.rfind('\n')+1) +1
    print(pos, '-> line', line, 'col', col)
