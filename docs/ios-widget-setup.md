# Widget iOS « Carte de coping » - étapes manuelles (Xcode)

Le code est déjà en place côté dépôt :

- `ios/App/App/AppDelegate.swift` - recopie les cartes (`CapacitorStorage.serein_cards` dans
  `UserDefaults.standard`) vers l'App Group `group.fr.sereinapp.tccact`, puis recharge le widget
  (au lancement + à chaque passage en arrière-plan).
- `ios/App/App/Info.plist` - schéma d'URL `serein-tcc` (deep-link du widget).
- `ios/App/CopingWidget/CopingWidget.swift` - le widget WidgetKit (à rattacher à la target ci-dessous).
- `serein-tcc-act.html` - écouteur `appUrlOpen` -> `navigateTo('cards')`.

Il reste les étapes qui **ne peuvent pas être automatisées par édition de fichiers** (création de
target + capacités de signature). Tout se fait dans Xcode.

## 1. Créer la target d'extension

1. Ouvrir `ios/App/App.xcworkspace` dans Xcode.
2. **File → New → Target… → Widget Extension**.
3. Product Name : **CopingWidget**. Décocher *Include Live Activity* et *Include Configuration App
   Intent* (on utilise une `StaticConfiguration`). Finish. Activer le scheme si proposé.
4. Xcode crée un dossier `CopingWidget/` avec un fichier d'exemple. **Remplacer tout le contenu du
   `.swift` généré** par celui de `ios/App/CopingWidget/CopingWidget.swift` de ce dépôt.
   - Veiller à n'avoir **qu'un seul `@main`** dans la target (supprimer le bundle d'exemple si Xcode
     en a créé un séparé).
5. Régler **iOS Deployment Target** de la target CopingWidget sur **15.0** (comme l'app).

## 2. Activer l'App Group sur LES DEUX targets

Avec la signature automatique (recommandé) :

1. Target **App** → onglet **Signing & Capabilities** → **+ Capability** → **App Groups** →
   ajouter `group.fr.sereinapp.tccact`.
2. Target **CopingWidget** → idem → ajouter **le même** `group.fr.sereinapp.tccact`.

Xcode crée le groupe dans le compte développeur et gère les fichiers `.entitlements`. Sans cette
capacité, `UserDefaults(suiteName:)` renvoie `nil` et le widget reste vide (échec silencieux).

## 3. Aligner les versions (sinon `npm test` casse)

`tests/versions.test.js` vérifie que **tous** les `MARKETING_VERSION` du `project.pbxproj` valent la
version marketing (actuellement `1.0`). La nouvelle target ajoute ses propres réglages :

- Mettre **MARKETING_VERSION = 1.0** sur la target CopingWidget (Debug + Release).
- Faire pointer son `CFBundleVersion`/`CFBundleShortVersionString` sur `$(CURRENT_PROJECT_VERSION)` /
  `$(MARKETING_VERSION)` (comme l'app) pour que l'auto-incrément Codemagic (`agvtool`) reste cohérent
  entre l'app et l'extension - App Store exige des numéros de build identiques.

## 4. Tester sur device

1. Lancer le scheme **App** sur un iPhone.
2. Créer 1-2 cartes de coping dans l'app.
3. **Mettre l'app en arrière-plan** (l'AppDelegate recopie alors les cartes dans l'App Group).
4. Écran d'accueil → ajouter le widget **Carte de coping** (taille Medium ou Large).
5. **Écran verrouillé (iOS 16+)** : verrouiller → appui long → Personnaliser → écran verrouillé →
   ajouter un widget → **Carte de coping** (format rectangulaire, sous l'heure). Le rendu y est
   monochrome (imposé par le système) ; le tap ouvre l'app sur **Cartes**.
6. Vérifier : la carte s'affiche, la rotation se fait dans le temps, le tap ouvre l'app sur **Cartes**.

## 5. Codemagic (build iOS de release)

- L'extension fait partie du même projet : elle est buildée automatiquement.
- **Provisioning** : le bundle `fr.sereinapp.tccact.CopingWidget` a besoin de son propre profil
  incluant la capacité **App Groups**. Avec la signature automatique via clé App Store Connect,
  Codemagic crée/récupère les profils des deux bundle ids. Vérifier dans le portail Apple que l'App
  Group est bien attaché aux **deux** App IDs.
- Re-tester un build TestFlight après l'ajout de la target (premier build avec extension).

## Notes

- Le bouton ↻ « carte suivante » du widget Android n'a pas d'équivalent interactif sous iOS < 17
  (widgets interactifs = iOS 17 + AppIntent). Ici le widget iOS fait défiler les cartes dans le temps
  (une toutes les ~3 h). Un bouton interactif iOS 17+ pourra être ajouté plus tard.
- Le widget lit `serein_cards` (clé brute) dans l'App Group ; c'est l'AppDelegate qui l'y dépose
  depuis le store Capacitor. On ne touche PAS au `group` global de `@capacitor/preferences` (cela
  casserait Android et migrerait les données existantes).
