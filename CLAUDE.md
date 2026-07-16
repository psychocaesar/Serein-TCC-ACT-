# Serein TCC·ACT — contexte pour Claude Code

App de soutien émotionnel TCC/ACT en français, packagée en natif iOS/Android via Capacitor 8. Extension de [Serein](https://sereinapp.fr) (méditation), même positionnement : pas d'allégation thérapeutique, "un compagnon, pas un thérapeute". `appId` : `fr.sereinapp.tccact`.

**Le `README.md` de ce repo est obsolète** (décrit une ancienne version : mood chips au lieu du curseur d'humeur, ancien appId, liste d'écrans dépassée). Ne pas s'y fier — ce fichier-ci (`CLAUDE.md`) est la source à jour.

## Source unique

**`serein-tcc-act.html`** — tout est inline (HTML/CSS/JS), un seul `<script>`, aucun bundler, aucun module ES. C'est le SEUL fichier à éditer directement.

`www/index.html` est un artefact de build (généré par `scripts/build-www.mjs`) — ne jamais l'éditer, il sera écrasé.

## Pipeline obligatoire avant tout commit ou build natif

```bash
npm test                          # tests/*.test.js (node --test)
npm run build:web                 # copie serein-tcc-act.html + assets → www/
npx cap sync                      # répercute www/ sur android/ + ios/
```

Toujours dans cet ordre, à chaque modification du fichier source. `npm run sync` fait `build:web` + `cap sync` en une commande.

## Architecture

- **`Store`** (localStorage + Capacitor Preferences pour la persistance native durable) : `STORE_KEYS` = toutes les clés synchronisées avec le natif (survivent à une purge WebView). `DATA_KEYS` = sous-ensemble effacé par "Tout effacer" (données utilisateur réelles, PAS les réglages comme le thème ou le verrou). `EXPORT_KEYS` = ce qui est inclus dans l'export/import JSON.
- **Navigation** : `screenMap` (écran → id DOM), `navMap` (écran → onglet parent), `screenInitFns` (fonction ré-exécutée à CHAQUE entrée sur l'écran, pas juste au chargement — important pour les écrans avec état à rafraîchir). `navigateTo(screen)` est un no-op si on est déjà sur cet écran.
- **Retour arrière** : 3 mécanismes doivent rester cohérents — chevron header (`goBack()`), bouton matériel Android (`handleHardwareBack()`, bloqué si `getOpenModal()` renvoie une modale ouverte), swipe depuis le bord gauche (24px, voir section dédiée dans le fichier). Toute nouvelle modale/overlay qui doit bloquer l'accès au contenu (comme le verrou biométrique) DOIT être ajoutée à `getOpenModal()`.
- **Pont natif Capacitor** : pattern `window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.X`, avec repli web gracieux. **Piège vérifié** : le nom exposé sur le pont natif n'est pas toujours celui du package npm — toujours vérifier le nom réel passé à `registerPlugin(...)` dans `node_modules/<plugin>/dist/plugin.js` avant de l'utiliser (ex. `@aparajita/capacitor-biometric-auth` s'enregistre sous `"BiometricAuthNative"`, pas `"BiometricAuth"` — ça a cassé le verrou pendant toute une session avant d'être trouvé).
- **Dates** : toujours `ymd(d)` (helper local AAAA-MM-JJ), jamais `toISOString().slice(0,10)` — `toISOString` est en UTC et décale d'un jour les saisies nocturnes (minuit→2h en France).
- **`[hidden]` sur un élément avec une classe qui fixe `display`** (ex. `.btn`) ne masque RIEN visuellement — un `display` posé par une classe (déclaration auteur normale) l'emporte toujours sur `[hidden]{display:none}` du navigateur (déclaration agent-utilisateur), quelle que soit la spécificité. Une règle globale `[hidden] { display: none !important; }` est déjà en place tout en haut de la feuille de style — ne pas la retirer, et se méfier si un `hidden` semble ne rien faire ailleurs.
- **CSP** en meta tag dans le head : si un jour une ressource externe est ajoutée (police, image, appel réseau), il faut mettre à jour la CSP en conséquence.

## Tests

`tests/clinical-logic.test.js` charge le vrai `<script>` de `serein-tcc-act.html` dans un sandbox `node:vm` (DOM stub), coupé juste avant `boot()` (marqueur textuel avant `initTheme()`) pour éviter tout effet de bord. Couvre la logique clinique pure : `getMoodFromValence`, routage `emotionSuggestions`, boussole des valeurs. En ajoutant une nouvelle fonction "métier" pure (mapping, seuils, routage), ajouter un test dans ce fichier plutôt que de faire confiance à la vérification manuelle seule.

`tests/versions.test.js` vérifie que `package.json`, `android/app/build.gradle` (versionName) et `project.pbxproj` (MARKETING_VERSION) sont tous alignés sur la constante `MARKETING`.

## CI

- **GitHub Actions** (`.github/workflows/tests.yml`) : `npm test` sur chaque push/PR vers `main`, automatique. Nécessite Node 22+ (le glob quoté de `node --test` exige Node 21+).
- **Codemagic** (`codemagic.yaml`) : build iOS + publication TestFlight. **Ne se déclenche JAMAIS automatiquement sur push** — toujours un clic manuel "Start new build" dans le dashboard Codemagic. Lance `npm test` en premier (échoue vite, avant de consommer des minutes Mac). Le build number iOS (`CURRENT_PROJECT_VERSION`) s'auto-incrémente depuis le dernier TestFlight via `agvtool` — **ne jamais le bumper à la main**. `MARKETING_VERSION`/`versionName` (version affichée) reste à bumper manuellement dans les 3 fichiers vérifiés par `versions.test.js`.
- **Android** : pas de CI, build manuel via Android Studio. `npm run release:android` incrémente `versionCode` — à lancer UNE fois par release réelle, pas à chaque build debug.

## Travail multi-machine (PC Windows + MacBook Pro M4)

Le repo est synchronisé via git/GitHub (`psychocaesar/Serein-TCC-ACT-`), pas via iCloud/Dropbox (ne jamais mettre ce dossier dans un dossier synchronisé par un autre outil — conflits garantis avec `.git`). Toujours `git pull` en arrivant, `git push` en partant. `.gitattributes` force LF partout pour éviter les faux diffs Windows/Mac.

Sur le Mac, `npx cap sync ios` régénère `Package.swift` avec des chemins natifs Mac (les chemins commis depuis Windows contiennent parfois des `\` au lieu de `/` — cosmétique, sans impact car regénéré à chaque sync, mais ne pas s'inquiéter si on le voit dans un diff après un sync côté Mac).

**Le vrai gain du Mac** : builds iOS en local (`npx cap sync ios && npx cap open ios`, puis Run dans Xcode) sans dépendre de Codemagic pour chaque itération. Permet enfin de tester en quelques secondes ce qui ne peut PAS se vérifier en preview navigateur : verrou Face ID/Touch ID, swipe-retour, orientation portrait verrouillée, comportements natifs en général.

## Docs complémentaires (ne pas dupliquer ici)

- `STORE-LISTING.md` — fiches Google Play / App Store, sécurité des données, checklist avant soumission.
- `docs/ios-widget-setup.md` — mise en place du widget iOS (target Xcode, App Group).

## Prochaines étapes connues

- **Validation sur device réel** (le Mac le permet enfin) : verrou biométrique (Face ID/Touch ID — le bug de nom de pont natif est corrigé mais jamais testé sur vrai matériel), swipe-retour, orientation portrait, aria-hidden du verrou avec VoiceOver.
- **Checklist `STORE-LISTING.md`** avant soumission : captures d'écran à refaire (datent d'avant la refonte UX : en-têtes, check-in à curseur, hub Comprendre, boussole des valeurs) ; formulaire "Applis de santé" Google Play (bien-être, PAS dispositif médical) ; déclaration "compte requis : non".
- **Pistes déjà proposées et mises en attente** (pas rejetées, à ressortir si pertinent) : mesure SUDS avant/après exercice, export du journal lisible par un thérapeute, raccourcis d'icône (appui long → SOS/Respirer/Noter une pensée), refonte des libellés de nav ("Apaiser/Comprendre/Parcours" sont abstraits pour un nouvel utilisateur — mais touche le cadre thérapeutique assumé, à valider avec César avant tout changement).
