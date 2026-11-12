#!/usr/bin/env python3
"""Kit logo Serein Relais : « le R en deux gestes » (novembre 2026).

Le R de « Relais » construit dans le trait du S de Serein : le montant (vert) est la séance,
le bol et la jambe (sable) sont ce qui part avec toi entre les séances.

Toute la géométrie vient d'ici (graisse SW, coupe petites tailles SW_SMALL, échelles K_*).
usage : python kit.py <dossier des polices woff2 de sereinapp.fr> <dossier du kit>
Nécessite fonttools, brotli, uharfbuzz. Les PNG viennent ensuite de icons.cjs (sharp).
"""
import io, os, re, sys
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
import uharfbuzz as hb

FONTS, KIT = sys.argv[1], sys.argv[2]

# ── Géométrie, sur un canevas 512 (centre 256,256) ──
# Le bol commence et finit à x = 196 (bouts ronds entièrement cachés sous le montant : sinon un point de
# sable dépasse sur son bord gauche) ; la jambe part à l'horizontale sur la ligne de la barre, pour que leurs
# bords du bas se prolongent sans cran.
BOWL_LEG = "M 196 150 H 256 A 58 58 0 0 1 256 266 H 196 M 236 266 C 272 266 302 316 326 362"
STEM = "M 186 150 V 362"
SW, SW_SMALL = 46, 54          # graisse normale ; coupe petites tailles (≤ 32 px), plus grasse
# Boîte visible avec SW = 46 : x 163 → 349, y 127 → 385 (186 × 258), centrée sur (256, 256)
BOX_W, BOX_H, BOX_X0, BOX_Y0 = 186, 258, 163, 127

VERT, SABLE, FOND = "#4db896", "#d8b78a", "#0f241d"
VERT_CLAIR, SABLE_CLAIR = "#2f9a76", "#c49a62"      # aplats foncés pour fonds clairs
ENCRE, VERT_PROFOND = "#1d2a25", "#2a8a68"

GRAD = ('<linearGradient id="vert" gradientUnits="userSpaceOnUse" x1="0" y1="130" x2="0" y2="382">'
        '<stop offset="0%" stop-color="#7ee8be"/><stop offset="55%" stop-color="#4db896"/><stop offset="100%" stop-color="#2a8a68"/></linearGradient>\n    '
        '<linearGradient id="sable" gradientUnits="userSpaceOnUse" x1="0" y1="130" x2="0" y2="382">'
        '<stop offset="0%" stop-color="#f0d9b5"/><stop offset="100%" stop-color="#c9a370"/></linearGradient>')
TILE_DEFS = ('<radialGradient id="bg" cx="50%" cy="50%" r="70%"><stop offset="0%" stop-color="#132e26"/><stop offset="100%" stop-color="#0a1a14"/></radialGradient>\n    '
             '<radialGradient id="halo" cx="50%" cy="45%" r="50%"><stop offset="0%" stop-color="#2f6f5e" stop-opacity="0.35"/><stop offset="100%" stop-color="#2f6f5e" stop-opacity="0"/></radialGradient>\n    ')


def mark(c_stem, c_bowl, k, tx, ty, sw=SW):
    """La marque : le bol et la jambe d'abord, le montant par-dessus."""
    return (f'<g transform="translate({tx:.1f} {ty:.1f}) scale({k})" fill="none" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round">\n'
            f'    <path d="{BOWL_LEG}" stroke="{c_bowl}"/>\n'
            f'    <path d="{STEM}" stroke="{c_stem}"/>\n  </g>')


def centered(k):
    """Translation qui centre la boîte visible au milieu d'un carré de 256 (ou 512 avec k doublé)."""
    return 128 - 256 * k


def svg(body, vb="0 0 256 256", defs="", comment=""):
    d = f"<defs>\n    {defs}\n  </defs>\n  " if defs else ""
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}">\n  <title>Serein Relais</title>\n  <!-- {comment} -->\n  {d}{body}\n</svg>\n'


def write(name, content):
    with open(os.path.join(KIT, name), "w", encoding="utf8") as f:
        f.write(content)
    print(name)


K = 0.80                      # symbole seul : 80 % de la hauteur du carré
T = centered(K)
KS = 0.78                     # coupe petites tailles : un peu plus petite, car plus grasse
TS = centered(KS)

write("symbole-noir.svg", svg(mark("#000", "#000", K, T, T), comment="Master noir : le R de Relais dans le trait de Serein, le montant puis ce qui part avec toi"))
write("symbole-blanc.svg", svg(mark("#fff", "#fff", K, T, T), comment="Une couleur, sur fond sombre"))
write("symbole-couleur.svg", svg(mark("url(#vert)", "url(#sable)", K, T, T), defs=GRAD, comment="Couleur, dégradés de l'app (fond sombre)"))
write("symbole-couleur-aplat.svg", svg(mark(VERT, SABLE, K, T, T), comment=f"Couleur en aplats : vert {VERT}, sable {SABLE}"))
write("symbole-petit.svg", svg(mark("url(#vert)", "url(#sable)", KS, TS, TS, SW_SMALL), defs=GRAD, comment="Coupe petites tailles (≤ 32 px) : trait plus gras"))
write("symbole-petit-noir.svg", svg(mark("#000", "#000", KS, TS, TS, SW_SMALL), comment="Coupe petites tailles, noir"))

# Icône d'app 512 : marque à 56 % de la hauteur, centrée. Carré plein : iOS et Android appliquent leur masque.
K_APP = 1.12
T_APP = 256 - 256 * K_APP
app_mark = mark("url(#vert)", "url(#sable)", K_APP, T_APP, T_APP)
tile = lambda rx: (f'<rect width="512" height="512"{rx} fill="url(#bg)"/>\n  <rect width="512" height="512"{rx} fill="url(#halo)"/>\n  ')
write("icone-app.svg", svg(tile("") + app_mark, vb="0 0 512 512", defs=TILE_DEFS + GRAD,
                           comment="Icône d'app : le R sur le fond de Serein. Carré plein, le système arrondit"))
write("icone-app-arrondie.svg", svg(tile(' rx="108"') + app_mark, vb="0 0 512 512", defs=TILE_DEFS + GRAD,
                                    comment="Icône d'app arrondie, pour les aperçus et le site"))

# Favicon : coupe petites tailles en aplats sur tuile sombre, marque agrandie pour remplir l'onglet
KF = 0.70
TF = centered(KF)
write("favicon.svg", svg(f'<rect width="256" height="256" rx="56" fill="{FOND}"/>\n  ' + mark(VERT, SABLE, KF, TF, TF, SW_SMALL),
                         comment="Favicon : coupe petites tailles, aplats, tuile sombre"))

# Maître vectoriel de l'app : mêmes classes bg / halo / fg que make-sources.mjs sait découper (éléments auto-fermants)
ka, ta = K_APP, T_APP
master = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <!-- Serein Relais (novembre 2026) : « le R en deux gestes ». Le R de Relais construit dans le trait du S de Serein :
       le montant vert, la séance ; le bol et la jambe sable, ce qui part avec toi entre les séances.
       Kit complet et règles d'usage : site/icones/kit-b/. Ancienne icône (S en deux temps) : logo-relais-s-deux-temps-ancienne.svg
       Les classes bg / halo / fg servent au découpage de make-sources.mjs (éléments auto-fermants). -->
  <defs>
    {TILE_DEFS}{GRAD}
  </defs>
  <rect class="bg" width="512" height="512" rx="108" fill="url(#bg)"/>
  <rect class="halo" width="512" height="512" rx="108" fill="url(#halo)"/>
  <path class="fg" transform="translate({ta:.1f} {ta:.1f}) scale({ka})" d="{BOWL_LEG}" fill="none" stroke="url(#sable)" stroke-width="{SW}" stroke-linecap="round" stroke-linejoin="round"/>
  <path class="fg" transform="translate({ta:.1f} {ta:.1f}) scale({ka})" d="{STEM}" fill="none" stroke="url(#vert)" stroke-width="{SW}" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
'''
write("logo-relais-maitre.svg", master)

# ── « Serein Relais » vectorisé en Fraunces (opsz 60, wght 400, « Relais » en italique, licence OFL) ──
def load(name):
    f = TTFont(os.path.join(FONTS, f"{name}.woff2")); f.flavor = None
    f = instantiateVariableFont(f, {"opsz": 60, "wght": 400})
    buf = io.BytesIO(); f.save(buf)
    return f, hb.Font(hb.Face(buf.getvalue()))

ROMAN, ITAL = load("fraunces-latin"), load("fraunces-italic-latin")

def run(font, text, x, size, track):
    tt, hf = font; s = size / tt["head"].unitsPerEm
    b = hb.Buffer(); b.add_str(text); b.guess_segment_properties(); hb.shape(hf, b, {"kern": True, "liga": True})
    gs, order, d = tt.getGlyphSet(), tt.getGlyphOrder(), []
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

r2 = lambda d: re.sub(r"(\d+\.\d{2})\d+", r"\1", d)
KL = 0.82                                   # marque des assemblages : 82 % de la hauteur de la zone
MARK_W, MARK_H = BOX_W * KL, BOX_H * KL

for theme, (txt, rel, vert, sable) in {"clair": (ENCRE, VERT_PROFOND, VERT_CLAIR, SABLE_CLAIR),
                                       "sombre": ("#f0f4f0", SABLE, VERT, SABLE)}.items():
    head = lambda w, h, c: f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.0f} {h}">\n  <title>Serein Relais</title>\n  <!-- {c} — « Serein Relais » vectorisé en Fraunces (opsz 60, 400, OFL) -->\n  '
    # Horizontal : marque calée à gauche, nom à droite
    d1, d2, w = word(100)
    gx = MARK_W + 40
    write(f"assemblage-horizontal-{theme}.svg", head(gx + w + 8, 256, f"Assemblage horizontal, fond {theme}") +
          mark(vert, sable, KL, -BOX_X0 * KL, (256 - MARK_H) / 2 - BOX_Y0 * KL) +
          f'\n  <g transform="translate({gx:.1f} 163)"><path d="{r2(d1)}" fill="{txt}"/><path d="{r2(d2)}" fill="{rel}"/></g>\n</svg>\n')
    # Empilé : marque centrée, nom dessous
    d1, d2, w = word(64)
    W = max(256, w) + 40
    write(f"assemblage-empile-{theme}.svg", head(W, 360, f"Assemblage empilé, fond {theme}") +
          mark(vert, sable, KL, W / 2 - 256 * KL, 128 - 256 * KL) +
          f'\n  <g transform="translate({(W - w) / 2:.1f} 320)"><path d="{r2(d1)}" fill="{txt}"/><path d="{r2(d2)}" fill="{rel}"/></g>\n</svg>\n')
