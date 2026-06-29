# Widget iOS « Carte de coping » - mise en place (sans Xcode au quotidien)

Contexte : pas de Mac au quotidien, build via **Codemagic**. Un widget iOS impose une
**target d'extension** qui ne peut pas être créée par simple édition de fichiers de façon fiable.
Plan retenu : **une seule session Mac/Xcode** pour créer la target, on committe le résultat, puis
Codemagic build pour toujours. L'App Group se règle au **portail Apple (web, sans Mac)**.

Code déjà présent dans le dépôt (rien à écrire) :
- `ios/App/App/AppDelegate.swift` - recopie les cartes vers l'App Group + recharge le widget.
- `ios/App/App/Info.plist` - schéma d'URL `serein-tcc` (deep-link).
- `ios/App/CopingWidget/CopingWidget.swift` - le widget (accueil + écran verrouillé).
- `serein-tcc-act.html` - écouteur `appUrlOpen` -> `navigateTo('cards')`.

Ces fichiers compilent déjà sans rien casser (l'entitlement App Group ne sert qu'au runtime).

---

## Partie A - Portail Apple Developer (web, AUCUN Mac requis)

À faire sur https://developer.apple.com → Certificates, Identifiers & Profiles → **Identifiers**.

1. **App Groups** → créer un groupe : identifiant `group.fr.sereinapp.tccact`.
2. Ouvrir l'App ID **`fr.sereinapp.tccact`** → activer la capacité **App Groups** → cocher le groupe
   `group.fr.sereinapp.tccact` → Save.
3. Créer un App ID **`fr.sereinapp.tccact.CopingWidget`** (type App) → activer **App Groups** →
   cocher `group.fr.sereinapp.tccact` → Save.

Les profils de provisioning seront créés/récupérés automatiquement par Codemagic (intégration App
Store Connect). Il suffit que la capacité soit activée sur les deux App IDs ci-dessus.

---

## Partie B - Session Mac/Xcode (une seule fois, ~1 h)

Sur le Mac : cloner le dépôt, puis ouvrir **`ios/App/App.xcodeproj`** (il n'y a pas de
`.xcworkspace`, le projet utilise Swift Package Manager).

### B1. Créer la target d'extension
1. **File → New → Target… → Widget Extension**.
2. Product Name : **CopingWidget**. **Décocher** *Include Live Activity* et *Include Configuration
   App Intent*. Finish. (« Activate scheme ? » → peu importe.)

### B2. Brancher NOTRE code widget (éviter le doublon)
Xcode a généré un `CopingWidget.swift` d'exemple (au même endroit que le nôtre).
1. Dans le navigateur de projet, **supprimer** (Move to Trash) les fichiers Swift d'exemple générés
   par Xcode pour la target (`CopingWidget.swift` d'exemple et un éventuel `*Bundle.swift`).
   - Si Xcode a écrasé notre fichier sur le disque, le restaurer d'abord :
     `git checkout ios/App/CopingWidget/CopingWidget.swift`
2. **File → Add Files to "App"…** → sélectionner `ios/App/CopingWidget/CopingWidget.swift` →
   dans « Add to targets », cocher **CopingWidget** (et décocher App). Add.
3. Il ne doit rester **qu'un seul `@main`** dans la target (le nôtre).

### B3. App Group sur LES DEUX targets
Signature automatique recommandée (Xcode gère les `.entitlements`) :
1. Target **App** → **Signing & Capabilities** → **+ Capability → App Groups** → cocher
   `group.fr.sereinapp.tccact`.
2. Target **CopingWidget** → idem → cocher **le même** groupe.

### B4. Réglages de la target widget
- **iOS Deployment Target = 15.0** (le code gère l'écran verrouillé en iOS 16+ via `@available`).
- **MARKETING_VERSION = 1.0** (Debug + Release) - sinon `tests/versions.test.js` échoue, et l'App
  Store exige la même version marketing que l'app.
- **Versioning System = Apple Generic** (défaut Xcode) pour que l'auto-bump Codemagic
  (`agvtool new-version -all`) incrémente aussi le widget.

### B5. Vérif locale rapide (si possible)
Sélectionner le scheme **App**, build (⌘B). Lancer sur simulateur, créer une carte de coping,
mettre l'app en arrière-plan, ajouter le widget. (Pas bloquant : le vrai test se fera via TestFlight.)

---

## Partie C - Ce qu'il faut COMMITTER après la session

Depuis le Mac (ou après récupération du dépôt) :

```
git add ios/App/App.xcodeproj/project.pbxproj
git add ios/App/App/App.entitlements                 # créé par Xcode (App Group)
git add ios/App/CopingWidget/                          # Info.plist, .entitlements, Assets générés
git status   # vérifier qu'aucun fichier de target n'est oublié
git commit -m "build(ios): target widget CopingWidget + App Group"
git push
```

Vérifier que `project.pbxproj` contient bien : la target `CopingWidget`, sa phase « Embed App
Extensions » sur la target App, et `CODE_SIGN_ENTITLEMENTS` sur les deux targets.

---

## Partie D - Codemagic (à ajuster en même temps)

Dans `codemagic.yaml`, workflow `ios-release` :

1. **Signature des deux bundle ids.** Retirer la ligne qui restreint à un seul id :
   ```yaml
   environment:
     ios_signing:
       distribution_type: app_store
       # bundle_identifier: fr.sereinapp.tccact   <-- SUPPRIMER cette ligne
   ```
   Sans `bundle_identifier`, Codemagic récupère/crée les profils pour **tous** les bundle ids du
   projet (app + extension). Vérifier dans les logs que les deux profils sont bien récupérés.
2. **Build number** : `agvtool new-version -all` (déjà en place) couvre le widget grâce à
   « Apple Generic » versioning. Rien à changer.
3. Le reste (`xcode-project use-profiles`, `build-ipa --scheme App`) embarque automatiquement
   l'extension via la phase « Embed App Extensions ».

---

## Partie E - Vérifier après le 1er build Codemagic

- Le build passe et publie sur TestFlight (le widget gonfle un peu l'IPA, normal).
- Sur device TestFlight : créer une carte, arrière-plan, ajouter le widget (accueil **et** écran
  verrouillé), taper dessus → l'app s'ouvre sur **Cartes**.

---

## Notes

- Le bouton ↻ « carte suivante » du widget Android n'a pas d'équivalent interactif sous iOS < 17
  (widgets interactifs = iOS 17 + AppIntent). Le widget iOS fait défiler les cartes dans le temps
  (une toutes les ~3 h). Un bouton interactif iOS 17+ pourra être ajouté plus tard.
- Le widget lit `serein_cards` (clé brute) dans l'App Group ; c'est l'AppDelegate qui l'y dépose
  depuis le store Capacitor. On ne touche PAS au `group` global de `@capacitor/preferences` (cela
  casserait Android et migrerait les données existantes).
- Sur l'écran verrouillé, le rendu est monochrome (imposé par iOS) - les couleurs de marque ne
  s'appliquent qu'aux widgets de l'écran d'accueil.
