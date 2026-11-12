#!/usr/bin/env python3
"""Pistes de logo n°3 pour Serein Relais (novembre 2026).
Usage : python pistes.py <dossier des polices woff2 de sereinapp.fr> <dossier de sortie>
Nécessite fonttools, brotli, uharfbuzz."""
import sys, io, os
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
import uharfbuzz as hb

FONTS, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)

def inst(file, **axes):
    f = instancer.instantiateVariableFont(TTFont(os.path.join(FONTS, file)), axes)
    f.flavor = None  # harfbuzz ne lit pas le woff2
    buf = io.BytesIO(); f.save(buf)
    return f, buf.getvalue()

def text_path(file, text, size, x0, y0, **axes):
    """Contours vectorisés d'un texte (crénage compris). Renvoie (d, largeur)."""
    f, data = inst(file, **axes)
    face = hb.Face(data); font = hb.Font(face)
    b = hb.Buffer(); b.add_str(text); b.guess_segment_properties()
    hb.shape(font, b, {"kern": True, "liga": True})
    gs = f.getGlyphSet(); k = size / f['head'].unitsPerEm
    order = f.getGlyphOrder()
    x = 0; ds = []
    for info, pos in zip(b.glyph_infos, b.glyph_positions):
        pen = SVGPathPen(gs, ntos=lambda v: f"{v:.1f}")
        gs[order[info.codepoint]].draw(TransformPen(pen, (k, 0, 0, -k, x0 + (x + pos.x_offset) * k, y0)))
        ds.append(pen.getCommands()); x += pos.x_advance
    return " ".join(ds), x * k

def glyph_box(file, ch, **axes):
    f, _ = inst(file, **axes)
    gs = f.getGlyphSet(); name = f.getBestCmap()[ord(ch)]
    bp = BoundsPen(gs); gs[name].draw(bp)
    return f, gs, name, bp.bounds

def glyph_fit(file, ch, cx, cy, height, **axes):
    """Un glyphe centré sur (cx, cy), à la hauteur voulue."""
    f, gs, name, (x0, y0, x1, y1) = glyph_box(file, ch, **axes)
    k = height / (y1 - y0)
    pen = SVGPathPen(gs, ntos=lambda v: f"{v:.1f}")
    gs[name].draw(TransformPen(pen, (k, 0, 0, -k, cx - (x0 + x1) / 2 * k, cy + (y0 + y1) / 2 * k)))
    return pen.getCommands()

# ── Couleurs (celles de l'app et de sereinapp.fr) ──
DEFS = '''<defs>
    <radialGradient id="bg" cx="50%" cy="50%" r="70%"><stop offset="0%" stop-color="#132e26"/><stop offset="100%" stop-color="#0a1a14"/></radialGradient>
    <radialGradient id="halo" cx="50%" cy="45%" r="50%"><stop offset="0%" stop-color="#2f6f5e" stop-opacity="0.35"/><stop offset="100%" stop-color="#2f6f5e" stop-opacity="0"/></radialGradient>
    <linearGradient id="vert" gradientUnits="userSpaceOnUse" x1="0" y1="130" x2="0" y2="382"><stop offset="0%" stop-color="#7ee8be"/><stop offset="55%" stop-color="#4db896"/><stop offset="100%" stop-color="#2a8a68"/></linearGradient>
    <linearGradient id="sable" gradientUnits="userSpaceOnUse" x1="0" y1="130" x2="0" y2="382"><stop offset="0%" stop-color="#f0d9b5"/><stop offset="100%" stop-color="#c9a370"/></linearGradient>
  </defs>'''
TILE = '<rect width="512" height="512" rx="{rx}" fill="url(#bg)"/><rect width="512" height="512" rx="{rx}" fill="url(#halo)"/>'

# ── Géométrie des trois pistes, sur un canevas 512 ──
S_PATH = "M 308 158 C 308 158 242 142 210 178 C 178 214 206 240 244 252 C 282 264 312 284 306 322 C 300 358 228 370 196 362"

def piste_a(vert, sable, sw=30, r=31):
    # A · Le trait d'union : le S de Serein relie deux points (deux séances)
    return (f'<g transform="translate(-51.2 -57) scale(1.2)">'
            f'<path d="{S_PATH}" fill="none" stroke="{vert}" stroke-width="{sw}" stroke-linecap="round"/>'
            f'<circle cx="308" cy="158" r="{r}" fill="{sable}"/><circle cx="196" cy="362" r="{r}" fill="{sable}"/></g>')

def piste_b(vert, sable, sw=46):
    # B · Le R en deux gestes : le montant (la séance) et le trait qui en part (ce que tu emportes)
    return (f'<g fill="none" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round">'
            f'<path d="M 186 150 H 256 A 58 58 0 0 1 256 266 H 186 M 236 268 C 268 276 300 318 326 362" stroke="{sable}"/>'
            f'<path d="M 186 150 V 362" stroke="{vert}"/></g>')

def piste_c(vert, sable):
    # C · Le R de « Relais » : Fraunces italique, la lettre du mot écrit en sable sur le site
    d = glyph_fit('fraunces-italic-latin.woff2', 'R', 262, 256, 250, wght=520, opsz=40)
    return f'<path d="{d}" fill="{sable}"/>'

PISTES = {'a-trait-d-union': piste_a, 'b-r-deux-gestes': piste_b, 'c-r-italique': piste_c}

def svg(body, vb="0 0 512 512", defs=True):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}">\n  <title>Serein Relais</title>\n  {DEFS if defs else ""}\n  {body}\n</svg>\n'

for name, fn in PISTES.items():
    open(f'{OUT}/{name}-icone.svg', 'w').write(svg(TILE.format(rx=114) + fn('url(#vert)', 'url(#sable)')))
    open(f'{OUT}/{name}-icone-carree.svg', 'w').write(svg(TILE.format(rx=0) + fn('url(#vert)', 'url(#sable)')))
    open(f'{OUT}/{name}-noir.svg', 'w').write(svg(fn('#111', '#111'), vb="120 120 272 272", defs=False))
    open(f'{OUT}/{name}-aplat.svg', 'w').write(svg(fn('#2f9a76', '#c49a62'), vb="120 120 272 272", defs=False))
    # Assemblages horizontaux, comme dans la barre du site : icône d'app + « Serein Relais » vectorisé
    # (Fraunces 400, opsz 60, « Relais » en italique)
    for theme, (c1, c2) in {'clair': ('#1d2a25', '#2a8a68'), 'sombre': ('#f0f4f0', '#d8b78a')}.items():
        d1, w1 = text_path('fraunces-latin.woff2', 'Serein', 150, 330, 306, wght=400, opsz=60)
        d2, w2 = text_path('fraunces-italic-latin.woff2', 'Relais', 150, 330 + w1 + 36, 306, wght=400, opsz=60)
        body = (f'<g transform="translate(56 136) scale(0.46875)">{TILE.format(rx=114)}{fn("url(#vert)", "url(#sable)")}</g>'
                f'<path d="{d1}" fill="{c1}"/><path d="{d2}" fill="{c2}"/>')
        open(f'{OUT}/{name}-assemblage-{theme}.svg', 'w').write(svg(body, vb=f"40 120 {330 + w1 + 36 + w2:.0f} 272"))
print('ok')
