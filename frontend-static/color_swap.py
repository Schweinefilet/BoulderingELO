from pathlib import Path
path = Path('src/App.tsx')
text = path.read_text(encoding='utf-8')
replacements = {
    "#121212": "#000",
    "#0b0b0b": "#000",
    "#0d0d0d": "#000",
    "#0a0a0a": "#000",
    "linear-gradient(to right, #111111, #222222)": "#000",
    "linear-gradient(135deg, #111111 0%, #222222 100%)": "#000",
}
for old, new in replacements.items():
    text = text.replace(old, new)
path.write_text(text, encoding='utf-8')

# components
comp_paths = [
    Path('src/components/ui/glow-border.tsx'),
    Path('src/components/ui/glowing-card.tsx'),
    Path('src/components/ui/background-beams.tsx')
]
for cp in comp_paths:
    t = cp.read_text(encoding='utf-8')
    t = t.replace('#0d0d0d', '#000').replace('#0a0a0a', '#000')
    cp.write_text(t, encoding='utf-8')
