# Serein Relais — contexte pour Claude Code

**Serein Relais** (anciennement « Serein TCC·ACT », renommée le 16/10/2026) : app de soutien entre les séances et après la thérapie, exercices TCC/ACT, en français, packagée en natif iOS/Android via Capacitor 8. Extension de [Serein](https://sereinapp.fr) (méditation), même positionnement : pas d'allégation thérapeutique, "un compagnon, pas un thérapeute". `appId` : `fr.sereinapp.tccact`.

Le renommage n'a touché que les noms **affichés**. Restent volontairement en « tcc » (invisibles pour l'utilisateur, ou à garder pour la compatibilité) : l'`appId`, le nom du fichier source et du repo, le schéma d'URL du widget `serein-tcc://`, et l'identifiant `app: 'serein-tcc'` des sauvegardes JSON (sinon les anciennes sauvegardes ne s'importent plus).

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

## Structure de l'app (refonte recentrée, octobre 2026)

Support entre deux séances et après la thérapie. 4 onglets + SOS :
- **Aujourd'hui** (`home`) : humeur 0-10 (haut = bien) + « ce qui domine » optionnel (jamais déduit du curseur) ; « Ta pratique du jour » = UNE proposition (`pickDailyPractice` : tâche du psy > expérience prévue > humeur) ; défi du jour (1 pensée, quel piège ?).
- **Exercices** (`exercices`) : 7 outils définis dans `EXERCISES` (respirer, journal, expériences, exposition, petit pas, valeurs & défusion, mes inquiétudes), chacun avec sa couleur et son niveau (`levelFor` : découverte 1 / pratique 5 / autonomie 15).
- **Mon carnet** (`carnet`) : tâches du psy (`taches`, deviennent « engagements de maintien » si thérapie terminée), plan anti-rechute (`plan`), cartes, pensées équilibrées (`jhistory`), ce qui va bien (`diary`), valeurs.
- **Mon suivi** (`suivi`) : mosaïque + courbe d'humeur.

**Après la thérapie** : l'interrupteur « Ma thérapie est terminée » (`serein_therapy_done`) transforme les tâches du psy en « engagements de maintien » (titres du carnet, « Ton engagement » au lieu de « Proposé par ton psy » sur l'accueil et le hub). **Point du mois** sur les signaux d'alerte du plan anti-rechute (`planCheckinDue`, testé) : carte sur l'accueil **seulement après la thérapie** (pendant le suivi, c'est le psy qui fait le point), 30 jours après la fin de la thérapie (`serein_therapy_done_at`) puis tous les 30 jours, si le plan a au moins un signal (« Plus tard » = 7 jours, `serein_plan_checkin_snooze`), faisable à tout moment depuis le plan ; historique dans `serein_plan_checkins`. Aucun score ni alerte : un signal remarqué renvoie vers « ce qui m'aide », le seuil pour recontacter le psy, et le 3114.

**Mosaïque** : chaque exercice mené au bout appelle `logPractice(kind)` → un carreau dans `serein_practice`, et avance la 1re tâche du psy du même exercice. Règles non négociables : aucune série, aucun jour « raté », rien ne s'efface, et rien ne pousse à « tout faire » (une thérapie cible quelques exercices : un exercice jamais fait n'affiche ni niveau vide ni « 0 » ; ceux proposés par le psy remontent en tête du hub) (validé avec César : pas de culpabilité, pas de ton « développement personnel »).

**Fondements cliniques (vérifiés le 16/10/2026 contre les fiches du vault `FORMATION TCC/04_Outils cliniques/Protocoles`)** : l'exposition cote la **croyance en la prédiction** avant/après (apprentissage inhibiteur, Craske 2014), jamais l'anxiété comme critère de réussite ; la respiration est présentée comme une compétence, à mettre de côté pendant une exposition ; le journal cote croyance (0-100) ET émotion (0-10) ; **aucune croyance pré-remplie** (anti-ancrage) : dans le journal, curseur au milieu et « – » tant qu'il n'est pas touché (`beliefSet`, enregistré `null`), dans l'exposition et les expériences curseurs à 50 (plus 70) ; le SOS donne 3114 + 15/112 ; aucune allégation d'efficacité sur la respiration 4-7-8 ou l'ancrage 5-4-3-2-1. **Ajoutés le 17/10/2026, d'après les fiches TAG et Activation comportementale du vault** : « Un petit pas » cote plaisir ET maîtrise de 0 à 10 (monitoring de l'AC ; la maîtrise évite de viser le plaisir à tout prix), stockés sur le carreau (`a`, `p`, `m`), « ce qui te fait du bien » à partir de 3 cotations (`rankSmallSteps`) ; « Mes inquiétudes » (`worry`, `serein_worries`) = report à un créneau fixe (~15 min, pas au coucher : durée et consigne tirées de Borkovec 1983, la fiche ne dit que « créneau dédié ») puis tri **problème actuel → résolution de problèmes écrite** (définir, générer, choisir, première étape + quand, évaluation quand c'est fait) / **« et si… » → tolérer l'incertitude, sans réassurance** (pas de débat sur la probabilité ; défusion en option ; l'exposition en imagination reste avec le psy).

Écrans supprimés à la refonte (ne pas les recréer sans en parler) : check-in détaillé, 30 questions « Explore », écran Schémas (→ aide dans l'étape 4 du journal), quiz 12 questions (→ défi du jour), échelle de catastrophe (→ étape 5 du journal), métaphores (3 gardées dans Valeurs & défusion), pensée du jour, compteur 🔥.

## Architecture

- **`Store`** (localStorage + Capacitor Preferences pour la persistance native durable) : `STORE_KEYS` = toutes les clés synchronisées avec le natif (survivent à une purge WebView). `DATA_KEYS` = sous-ensemble effacé par "Tout effacer" (données utilisateur réelles, PAS les réglages comme le thème ou le verrou). `EXPORT_KEYS` = ce qui est inclus dans l'export/import JSON.
- **Navigation** : `screenMap` (écran → id DOM), `navMap` (écran → onglet parent), `screenInitFns` (fonction ré-exécutée à CHAQUE entrée sur l'écran, pas juste au chargement — important pour les écrans avec état à rafraîchir). `navigateTo(screen)` est un no-op si on est déjà sur cet écran.
- **Retour arrière** : 3 mécanismes doivent rester cohérents — chevron header (`goBack()`), bouton matériel Android (`handleHardwareBack()`, bloqué si `getOpenModal()` renvoie une modale ouverte), swipe depuis le bord gauche (24px, voir section dédiée dans le fichier). Toute nouvelle modale/overlay qui doit bloquer l'accès au contenu (comme le verrou biométrique) DOIT être ajoutée à `getOpenModal()`.
- **Pont natif Capacitor** : pattern `window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.X`, avec repli web gracieux. **Piège vérifié** : le nom exposé sur le pont natif n'est pas toujours celui du package npm — toujours vérifier le nom réel passé à `registerPlugin(...)` dans `node_modules/<plugin>/dist/plugin.js` avant de l'utiliser (ex. `@aparajita/capacitor-biometric-auth` s'enregistre sous `"BiometricAuthNative"`, pas `"BiometricAuth"` — ça a cassé le verrou pendant toute une session avant d'être trouvé).
- **Dates** : toujours `ymd(d)` (helper local AAAA-MM-JJ), jamais `toISOString().slice(0,10)` — `toISOString` est en UTC et décale d'un jour les saisies nocturnes (minuit→2h en France).
- **`[hidden]` sur un élément avec une classe qui fixe `display`** (ex. `.btn`) ne masque RIEN visuellement — un `display` posé par une classe (déclaration auteur normale) l'emporte toujours sur `[hidden]{display:none}` du navigateur (déclaration agent-utilisateur), quelle que soit la spécificité. Une règle globale `[hidden] { display: none !important; }` est déjà en place tout en haut de la feuille de style — ne pas la retirer, et se méfier si un `hidden` semble ne rien faire ailleurs.
- **Cycle de vie UIScene (iOS)** : obligatoire depuis le SDK iOS 27 — sans `SceneDelegate.swift` + `UIApplicationSceneManifest` dans `Info.plist`, l'app plante au lancement (`UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption`). Nécessite Capacitor ≥ 8.5.1 (`SceneDelegateProxy`). Les rappels `application…Background/Foreground` de l'`AppDelegate` ne sont plus appelés : passer par `SceneDelegate` (ex. `sceneDidEnterBackground` → `syncWidgetData()`). Migration identique à l'app Serein.
- **CSP** en meta tag dans le head : si un jour une ressource externe est ajoutée (police, image, appel réseau), il faut mettre à jour la CSP en conséquence.

## Tests

`tests/clinical-logic.test.js` charge le vrai `<script>` de `serein-tcc-act.html` dans un sandbox `node:vm` (DOM stub), coupé juste avant `boot()` (marqueur textuel avant `initTheme()`) pour éviter tout effet de bord. Couvre la logique clinique pure : `pickDailyPractice` (routage de la pratique du jour, dont « détresse forte → jamais le journal »), échelle d'humeur et migration de l'ancien suivi, niveaux, défi du jour, re-cotation du journal, boussole des valeurs. En ajoutant une nouvelle fonction "métier" pure (mapping, seuils, routage), ajouter un test dans ce fichier plutôt que de faire confiance à la vérification manuelle seule.

`tests/versions.test.js` vérifie que `package.json`, `android/app/build.gradle` (versionName) et `project.pbxproj` (MARKETING_VERSION) sont tous alignés sur la constante `MARKETING`.

## CI

- **GitHub Actions** (`.github/workflows/tests.yml`) : `npm test` sur chaque push/PR vers `main`, automatique. Nécessite Node 22+ (le glob quoté de `node --test` exige Node 21+).
- **Xcode Cloud** (même circuit que l'app Serein méditation, Codemagic retiré le 16/10/2026 ; historique : `git log -- codemagic.yaml`) : build iOS + TestFlight. `ios/App/ci_scripts/ci_post_clone.sh` est lancé automatiquement après le clone : `npm ci`, **`npm test` (s'il échoue, rien n'arrive sur TestFlight)**, `build:web`, `cap sync ios`. Le script doit rester exécutable (`chmod +x`). Le workflow (déclencheur, archive, TestFlight) se règle dans Xcode ou App Store Connect, pas dans le repo. Le build number est attribué par Xcode Cloud (à régler une fois au-dessus du dernier build TestFlight de l'ère Codemagic) — **ne jamais le bumper à la main**. `MARKETING_VERSION`/`versionName` (version affichée) reste à bumper manuellement dans les 3 fichiers vérifiés par `versions.test.js`. Apple ID de l'app : `6781663800`.
- **Android** : pas de CI, build manuel via Android Studio. `npm run release:android` incrémente `versionCode` — à lancer UNE fois par release réelle, pas à chaque build debug.

## Travail multi-machine (PC Windows + MacBook Pro M4)

Le repo est synchronisé via git/GitHub (`psychocaesar/Serein-TCC-ACT-`), pas via iCloud/Dropbox (ne jamais mettre ce dossier dans un dossier synchronisé par un autre outil — conflits garantis avec `.git`). Toujours `git pull` en arrivant, `git push` en partant. `.gitattributes` force LF partout pour éviter les faux diffs Windows/Mac.

Sur le Mac, `npx cap sync ios` régénère `Package.swift` avec des chemins natifs Mac (les chemins commis depuis Windows contiennent parfois des `\` au lieu de `/` — cosmétique, sans impact car regénéré à chaque sync, mais ne pas s'inquiéter si on le voit dans un diff après un sync côté Mac).

**Le vrai gain du Mac** : builds iOS en local (`npx cap sync ios && npx cap open ios`, puis Run dans Xcode) sans attendre Xcode Cloud pour chaque itération. Permet enfin de tester en quelques secondes ce qui ne peut PAS se vérifier en preview navigateur : verrou Face ID/Touch ID, swipe-retour, orientation portrait verrouillée, comportements natifs en général.

## Docs complémentaires (ne pas dupliquer ici)

- `CLAUDE.local.md` (non versionné, repo public) : feuille de route interne, positionnement, acquisition, pistes cliniques en attente. À recopier à la main sur chaque machine.

- `STORE-LISTING.md` — fiches Google Play / App Store, sécurité des données, checklist avant soumission.
- `docs/ios-widget-setup.md` — mise en place du widget iOS (target Xcode, App Group).

## Prochaines étapes connues

- **Validation sur device réel** (le Mac le permet enfin) : verrou biométrique (Face ID/Touch ID — le bug de nom de pont natif est corrigé mais jamais testé sur vrai matériel), swipe-retour, orientation portrait, aria-hidden du verrou avec VoiceOver.
- **Checklist `STORE-LISTING.md`** avant soumission (captures et textes refaits le 16/10/2026) : formulaire "Applis de santé" Google Play (bien-être, PAS dispositif médical) ; déclaration "compte requis : non".
- **Suite de la refonte** : icônes dessinées à la place des emojis dans les écrans d'exercices (déjà fait pour la nav, les hubs et l'accueil).
- **Pistes déjà proposées et mises en attente** : raccourcis d'icône (appui long → SOS/Respirer/Noter une pensée).
