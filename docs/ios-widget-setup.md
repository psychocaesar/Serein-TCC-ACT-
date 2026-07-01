# Widget iOS « Carte de coping » - mise en place

**Mise à jour : la target d'extension Xcode a été injectée par script (2026-06-29),
sans Xcode ni Mac.** César n'a pas d'accès Mac dans l'immédiat ; la target
`CopingWidget` a donc été ajoutée à `ios/App/App.xcodeproj/project.pbxproj` par un
script Node (`scripts/add-ios-widget-target.cjs`, utilise la lib `xcode`, le même
format que manipule Xcode en interne), **validé localement avant application** :
round-trip parse, idempotence testée (2 exécutions consécutives → 2e no-op),
diff isolé du bruit de reformatage (confirmé nul sur le fichier original
non modifié), structure comparée ligne à ligne aux conventions Xcode réelles.
Il reste 2 choses qui ne peuvent PAS être vérifiées sans un vrai build Xcode :
que le Swift compile, et que la signature/provisioning passe en CI. Voir
« Si le build Codemagic échoue » plus bas.

Code déjà présent dans le dépôt :
- `ios/App/App/AppDelegate.swift` - recopie les cartes vers l'App Group + recharge le widget.
- `ios/App/App/Info.plist` - schéma d'URL `serein-tcc` (deep-link).
- `ios/App/App/App.entitlements` - App Group (nouveau, l'app n'en avait aucun avant).
- `ios/App/CopingWidget/CopingWidget.swift` - le widget (accueil + écran verrouillé).
- `ios/App/CopingWidget/Info.plist` - Info.plist de l'extension (NSExtensionPointIdentifier).
- `ios/App/CopingWidget/CopingWidget.entitlements` - App Group côté extension.
- `serein-tcc-act.html` - écouteur `appUrlOpen` -> `navigateTo('cards')`.
- `ios/App/App.xcodeproj/project.pbxproj` - target `CopingWidget` (app-extension),
  build phases Sources/Frameworks, embed via Copy Files (PlugIns) sur la target
  App, dépendance de target, réglages Debug/Release (voir détail plus bas).

## Partie A - Portail Apple Developer (web, aucun Mac requis) — À FAIRE

Sur https://developer.apple.com → Certificates, Identifiers & Profiles → **Identifiers**.

1. **App Groups** → créer un groupe : identifiant `group.fr.sereinapp.tccact`.
2. Ouvrir l'App ID **`fr.sereinapp.tccact`** → activer la capacité **App Groups** →
   cocher le groupe `group.fr.sereinapp.tccact` → Save.
3. Créer un App ID **`fr.sereinapp.tccact.CopingWidget`** (type App) → activer
   **App Groups** → cocher `group.fr.sereinapp.tccact` → Save.

C'est la seule étape manuelle restante. Sans elle, `UserDefaults(suiteName:)`
renverra `nil` au runtime (l'app démarre et fonctionne normalement, juste sans
widget alimenté), et surtout Codemagic ne pourra pas générer de profil de
provisioning valide pour le bundle id de l'extension (l'App Group doit exister
et être attaché aux 2 App IDs AVANT le premier build avec la target).

## Partie B - Codemagic (déjà ajusté)

`codemagic.yaml` : `distribution_type` ET `bundle_identifier` sont **tous les deux
obligatoires** pour la récupération auto des signatures Codemagic (les retirer
fait échouer la validation du yaml - erreur rencontrée et corrigée). Le
`bundle_identifier: fr.sereinapp.tccact` (l'app, inchangé) suffit : Codemagic
matche automatiquement tout bundle id de la forme `fr.sereinapp.tccact.*` pour
les extensions (donc `fr.sereinapp.tccact.CopingWidget` est couvert sans rien
ajouter). Le reste du pipeline est inchangé :
`agvtool new-version -all` couvre aussi la target widget (elle est en
`VERSIONING_SYSTEM = apple-generic`, comme l'app), `xcode-project use-profiles`
puis `build-ipa --scheme App` embarquent l'extension automatiquement (phase
« Copy Files » déjà présente sur la target App).

## Partie C - Si le build Codemagic échoue

Deux catégories de risque, dans cet ordre de probabilité :

1. **Signature/provisioning** (le plus probable) : si Codemagic ne trouve/crée pas
   de profil pour `fr.sereinapp.tccact.CopingWidget`, vérifier en premier que la
   Partie A est bien faite (App Group attaché aux 2 App IDs). Regarder les logs de
   l'étape « Apply code signing to Xcode project ».
2. **Compilation Swift** : `CopingWidget.swift` n'a jamais été compilé par un vrai
   toolchain Xcode (relu attentivement, mais pas testé). Si erreur de build ici,
   copier le message d'erreur Codemagic tel quel - avec la ligne exacte, l'IA peut
   diagnostiquer sans avoir besoin d'un Mac.

Dans les deux cas : **coller les logs Codemagic complets** (pas un résumé) permet
un diagnostic précis sans accès Mac.

## Partie D - Vérifier après un build réussi

- TestFlight reçoit un IPA qui contient l'extension (taille légèrement plus grosse).
- Sur device : créer une carte de coping, mettre l'app en arrière-plan, ajouter le
  widget (écran d'accueil **et** écran verrouillé - iOS 16+), taper dessus ->
  l'app s'ouvre sur **Cartes**.

## Annexe - Régénérer/inspecter la target manuellement

`npm run ios:add-widget-target` relance le script d'injection (idempotent - ne
fait rien si la target existe déjà). Utile si `project.pbxproj` est un jour
recréé depuis zéro (ex. `cap add ios` relancé par erreur, ce qui écraserait tout
le dossier `ios/`).

## Alternative (si un accès Mac devient possible)

Si un jour l'accès Mac est plus simple et qu'un ajustement dans Xcode est plus
rapide qu'un aller-retour de logs Codemagic : ouvrir `ios/App/App.xcodeproj`, la
target `CopingWidget` apparaît déjà dans la liste des targets (créée par le
script). Les réglages sont modifiables normalement depuis l'onglet
**Signing & Capabilities** / **Build Settings** comme n'importe quelle target
créée depuis l'UI - rien de spécifique au fait qu'elle ait été injectée par
script.

## Notes

- Le bouton ↻ « carte suivante » du widget Android n'a pas d'équivalent interactif
  sous iOS < 17 (widgets interactifs = iOS 17 + AppIntent). Le widget iOS fait
  défiler les cartes dans le temps (une toutes les ~3 h).
- Le widget lit `serein_cards` (clé brute) dans l'App Group ; c'est l'AppDelegate
  qui l'y dépose depuis le store Capacitor. On ne touche PAS au `group` global de
  `@capacitor/preferences` (cela casserait Android et migrerait les données
  existantes).
- Sur l'écran verrouillé, le rendu est monochrome (imposé par iOS).
- **Vérifié explicitement** : `npx cap sync ios` ne touche jamais
  `project.pbxproj` (seul `cap add` le fait, via `editProjectSettingsIOS`, qui
  fait un remplacement regex global de `PRODUCT_BUNDLE_IDENTIFIER` - dangereux
  pour un projet multi-target, mais qui ne tourne jamais pendant un sync normal).
  Donc le pipeline `build:web && cap sync` habituel ne risque pas d'écraser la
  target widget.
