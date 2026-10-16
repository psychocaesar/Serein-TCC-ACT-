# Écrit les fichiers du kit « S en deux temps » à partir d'une seule géométrie
import sys; sys.path.insert(0, sys.argv[1])
from gen_s_lib import paths
T1, T2, SW = 0.7, 0.3, 44            # coupure et graisse retenues
T1s, T2s, SWs = 0.64, 0.36, 54        # coupe petites tailles : plus gras, coupure plus large
K = 0.7; TX = 128 - 245*K - 4.9; TY = 128 - 256*K - 3   # -3 : centrage optique
VERT, SABLE, FOND = "#4db896", "#d8b78a", "#0f241d"
DEFS = '''<defs>
    <linearGradient id="vert" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#7ee8be"/><stop offset="55%" stop-color="#4db896"/><stop offset="100%" stop-color="#2a8a68"/></linearGradient>
    <linearGradient id="sable" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#f0d9b5"/><stop offset="100%" stop-color="#c9a370"/></linearGradient>
  </defs>'''
def mark(c1, c2, small=False, k=K, tx=TX, ty=TY, sw=None):
    t1, t2, sw0 = (T1s, T2s, SWs) if small else (T1, T2, SW)
    sw = sw or sw0
    top, bot = paths(t1, t2)
    return f'''<g transform="translate({tx:.1f} {ty:.1f}) scale({k})" fill="none" stroke-width="{sw}" stroke-linecap="round">
    <path d="{top}" stroke="{c1}"/>
    <path d="{bot}" stroke="{c2}"/>
  </g>'''
def svg(body, vb="0 0 256 256", defs=False, comment=""):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}">\n  <title>Serein Relais</title>\n  <!-- {comment} -->\n  {DEFS if defs else ""}\n  {body}\n</svg>\n'
files = {
 "symbole-noir.svg": svg(mark("#000","#000"), comment="Master noir : le S de Serein coupé dans l'épine — la séance, puis le relais"),
 "symbole-blanc.svg": svg(mark("#fff","#fff"), comment="Une couleur, sur fond sombre"),
 "symbole-couleur.svg": svg(mark("url(#vert)","url(#sable)"), defs=True, comment="Couleur, dégradés de l'app (fond sombre)"),
 "symbole-couleur-aplat.svg": svg(mark(VERT, SABLE), comment=f"Couleur en aplats : vert {VERT}, sable {SABLE}"),
 "symbole-petit.svg": svg(mark("url(#vert)","url(#sable)", small=True), defs=True, comment="Coupe petites tailles (≤ 32 px) : plus gras, coupure plus large"),
 "symbole-petit-noir.svg": svg(mark("#000","#000", small=True), comment="Coupe petites tailles, noir"),
}
# Icône d'app 1024 : fond plein carré (iOS arrondit lui-même), marque ~62 % de la hauteur
bg = '''<defs>
    <radialGradient id="bg" cx="50%" cy="50%" r="70%"><stop offset="0%" stop-color="#132e26"/><stop offset="100%" stop-color="#0a1a14"/></radialGradient>
    <radialGradient id="halo" cx="50%" cy="45%" r="50%"><stop offset="0%" stop-color="#2f6f5e" stop-opacity="0.35"/><stop offset="100%" stop-color="#2f6f5e" stop-opacity="0"/></radialGradient>
    <linearGradient id="vert" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#7ee8be"/><stop offset="55%" stop-color="#4db896"/><stop offset="100%" stop-color="#2a8a68"/></linearGradient>
    <linearGradient id="sable" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#f0d9b5"/><stop offset="100%" stop-color="#c9a370"/></linearGradient>
  </defs>'''
k2 = K*2*0.86; tx2 = 256 - 245*k2 - 8.4; ty2 = 256 - 256*k2 - 6
files["icone-app.svg"] = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <title>Serein Relais</title>
  <!-- Icône d'app : S en deux temps sur le fond de Serein. Carré plein : iOS et Android appliquent leur propre masque -->
  {bg}
  <rect width="512" height="512" fill="url(#bg)"/>
  <rect width="512" height="512" fill="url(#halo)"/>
  {mark("url(#vert)","url(#sable)", k=k2, tx=tx2, ty=ty2, sw=40)}
</svg>
'''
files["icone-app-arrondie.svg"] = files["icone-app.svg"].replace('<rect width="512" height="512" fill="url(#bg)"/>','<rect width="512" height="512" rx="108" fill="url(#bg)"/>').replace('<rect width="512" height="512" fill="url(#halo)"/>','<rect width="512" height="512" rx="108" fill="url(#halo)"/>').replace("Carré plein : iOS et Android appliquent leur propre masque","Version arrondie pour les aperçus et le site")
for n, s in files.items(): open(n, "w").write(s)
print("\n".join(files))
# Favicon : coupe petites tailles en aplats, sur tuile sombre, marque agrandie pour remplir l'onglet
kf = 0.84; txf = 128 - 245*kf - 5.9; tyf = 128 - 256*kf - 2
open("favicon.svg","w").write(f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
  <title>Serein Relais</title>
  <!-- Favicon : coupe petites tailles, aplats, tuile sombre -->
  <rect width="256" height="256" rx="56" fill="{FOND}"/>
  {mark(VERT, SABLE, small=True, k=kf, tx=txf, ty=tyf)}
</svg>
''')
