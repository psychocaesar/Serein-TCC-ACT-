# Serein Relais — règles d'usage du logo

## 1. Le logo
- **Idée** : le S de Serein (même tracé que l'app sœur) coupé dans l'épine. La moitié verte, c'est la séance ; la moitié sable prend le relais entre les séances.
- **Versions** : assemblage horizontal · assemblage empilé · symbole seul · icône d'app.
- **Fichiers** (dans ce dossier) :
  | Usage | Fichier |
  |---|---|
  | Icône d'app (iOS, Android, stores) | `icone-app.svg` (carré plein, le système arrondit) · `icones/icone-app-1024.png` |
  | Aperçus, site | `icone-app-arrondie.svg` |
  | Favicon, onglet | `favicon.svg`, `icones/favicon.ico`, `icones/favicon-16/32/48.png` |
  | Web / PWA | `icones/apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `maskable-512.png` |
  | Symbole seul | `symbole-couleur.svg` (dégradés de l'app, fond sombre) · `symbole-couleur-aplat.svg` · `symbole-noir.svg` · `symbole-blanc.svg` · `variantes/` |
  | Petites tailles (≤ 32 px) | `symbole-petit.svg`, `symbole-petit-noir.svg` : plus gras, coupure plus large |
  | Avec le nom | `assemblage-horizontal-clair.svg` / `-sombre.svg` · `assemblage-empile-clair.svg` / `-sombre.svg` |

## 2. Zone de protection
Autour du logo, garder un espace libre égal à **l'épaisseur du trait du S**, ×2. La zone grandit avec le logo.

## 3. Taille minimale
| Version | Écran | Impression |
|---|---|---|
| Assemblage horizontal | 120 px de large | 30 mm |
| Symbole | 16 px (coupe petites tailles) | 6 mm |

## 4. Couleurs
| Nom | HEX | Rôle |
|---|---|---|
| Vert Serein | `#4db896` (dégradé `#7ee8be` → `#2a8a68`) | moitié haute du S (la séance) |
| Sable | `#d8b78a` (dégradé `#f0d9b5` → `#c9a370`) | moitié basse (le relais), « Relais » sur fond sombre |
| Vert profond | `#2a8a68` | « Relais » et version une couleur sur fond clair |
| Fond nuit | `#0f241d` (dégradé `#132e26` → `#0a1a14`) | fond de l'icône, tuiles |
| Encre | `#1d2a25` | « Serein » sur fond clair |

**Fonds autorisés** : couleur sur fond nuit · couleur en aplats sur crème `#f4f1ea` ou blanc · blanc sur fond nuit · noir sur blanc.
Sur fond clair, utiliser les aplats foncés (vert `#2f9a76`, sable `#c49a62`) des assemblages « clair ».

## 5. Typographie
- Nom : **Fraunces** 400, axe optique 60, « Relais » en italique (comme sur sereinapp.fr). Texte courant : Hanken Grotesk.
- Les deux polices sont sous licence SIL OFL : usage dans un logo autorisé.
- Dans les assemblages, « Serein Relais » est **vectorisé** (contours Fraunces, crénage compris) : les SVG s'affichent pareil partout, sans la police.

## 6. À éviter
Ne pas recoller les deux moitiés · ne pas inverser les couleurs (sable en haut) · ne pas déformer ni pivoter · pas d'ombre ni de lueur ajoutée · ne pas changer l'écart entre les moitiés · ne pas retaper « Serein Relais » dans une autre police.

## 7. Régénérer
Toute la géométrie vient de `outils/kit.py` (`python3 outils/kit.py outils`) (coupure `T1/T2`, graisse `SW`, échelle `K`). Puis `outils/wordmark.py <dossier des polices woff2> .` (assemblages vectorisés ; nécessite fonttools, brotli et uharfbuzz) et `outils/icons.cjs` (PNG, via sharp), à lancer depuis ce dossier.
