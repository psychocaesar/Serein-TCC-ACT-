# Vectorise « Serein Relais » en Fraunces (opsz 60, wght 400, « Relais » en italique) et écrit les assemblages SVG.
# usage : wordmark.py <dossier fonts> <dossier kit>
import sys, io, re
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
import uharfbuzz as hb
FD, KIT = sys.argv[1], sys.argv[2]
def load(name):
    f = TTFont(f"{FD}/{name}.woff2"); f.flavor = None
    f = instantiateVariableFont(f, {"opsz": 60, "wght": 400})
    buf = io.BytesIO(); f.save(buf); data = buf.getvalue()
    return f, hb.Font(hb.Face(data))
ROMAN, ITAL = load("fraunces-latin"), load("fraunces-italic-latin")
def run(font, text, x, size, track):
    tt, hf = font; upem = tt["head"].unitsPerEm; s = size / upem
    b = hb.Buffer(); b.add_str(text); b.guess_segment_properties(); hb.shape(hf, b, {"kern": True, "liga": True})
    gs = tt.getGlyphSet(); order = tt.getGlyphOrder(); d = []
    for info, pos in zip(b.glyph_infos, b.glyph_positions):
        pen = SVGPathPen(gs)
        gs[order[info.codepoint]].draw(TransformPen(pen, (s, 0, 0, -s, x + pos.x_offset * s, -pos.y_offset * s)))
        if pen.getCommands(): d.append(pen.getCommands())
        x += pos.x_advance * s + track
    return " ".join(d), x
def word(size):
    track = -size / 100
    d1, x = run(ROMAN, "Serein ", 0, size, track)
    d2, x = run(ITAL, "Relais", x, size, track)
    return d1, d2, x - track
def r(d): return re.sub(r"(\d+\.\d{2})\d+", r"\1", d)
sym = open(f"{KIT}/symbole-couleur-aplat.svg").read()
g = re.search(r"<g [\s\S]*?</g>", sym).group(0)
themes = {"clair": ("#1d2a25", "#2a8a68", "#2f9a76", "#c49a62"), "sombre": ("#f0f4f0", "#d8b78a", "#4db896", "#d8b78a")}
for name, (txt, rel, vert, sable) in themes.items():
    gg = g.replace("#4db896", vert).replace("#d8b78a", sable)
    head = lambda w, h, c: f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.0f} {h}">\n  <title>Serein Relais</title>\n  <!-- {c} — « Serein Relais » vectorisé en Fraunces (opsz 60, 400, OFL) -->\n  '
    d1, d2, w = word(100)
    open(f"{KIT}/assemblage-horizontal-{name}.svg", "w").write(head(210 + w + 8, 256, f"Assemblage horizontal, fond {name}") +
        f'<g transform="translate(-24 0)">{gg}</g>\n  <g transform="translate(210 162)"><path d="{r(d1)}" fill="{txt}"/><path d="{r(d2)}" fill="{rel}"/></g>\n</svg>\n')
    d1, d2, w = word(64)
    W = max(256, w) + 40
    open(f"{KIT}/assemblage-empile-{name}.svg", "w").write(head(W, 360, f"Assemblage empilé, fond {name}") +
        f'<g transform="translate({(W-256)/2:.1f} 0)">{gg}</g>\n  <g transform="translate({(W-w)/2:.1f} 320)"><path d="{r(d1)}" fill="{txt}"/><path d="{r(d2)}" fill="{rel}"/></g>\n</svg>\n')
print("ok")
