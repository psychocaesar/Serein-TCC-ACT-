# Serein TCC·ACT

> Outil de soutien emotionnel offline-first, inspire des therapies cognitivo-comportementales (TCC) et de l'ACT. Sans pub, sans compte, sans serveur.

Extension de [Serein](https://sereinapp.fr) - application de meditation open source.

---

## Avertissement important

**Cet outil ne remplace pas un accompagnement psychologique ou psychiatrique.**
Si tu traverses une periode difficile ou que tu as des pensees de te faire du mal, consulte un professionnel de sante.

- Detresse psychologique : **3114** (numero national, 24h/24)
- Trouver un psy : https://monsoutienpsy.ameli.fr/recherche-psychologue

---

## Apercu

Serein TCC·ACT est une PWA single-file (`serein-tcc-act.html`) qui fonctionne directement dans le navigateur, sans installation, sans connexion apres le premier chargement.

Inspiree de [MindShift CBT](https://www.anxietycanada.com/resources/mindshift-cbt/) et [What's Up?](https://www.whatsupapp.io/), en francais, open source et respectueuse de la vie privee.

### Fonctionnalites

| Ecran | Description |
|---|---|
| **Accueil** | Salutation contextuelle, 4 mood chips, stats de progression, carrousel d'outils |
| **Check-in** | Identification de l'emotion, champ declencheur, suggestion d'outil adaptee |
| **Journal TCC** | 4 etapes guidees (situation, pensee automatique, emotion, pensee equilibree) avec reformulation live |
| **Calme** | Respiration animee (3 techniques) + ancrage sensoriel 5-4-3-2-1 |
| **Schemas** | 6 biais cognitifs cliquables avec insight + exercice ACT "Faire de la place" |
| **Exposition** | Fear ladder - 4 paliers cochables pour l'exposition graduelle |

### Techniques implementees

- **TCC** - Restructuration cognitive (journal 4 etapes, schemas de pensee)
- **ACT** - Defusion cognitive ("Faire de la place")
- **Respiration** - Coherence cardiaque 5-5, boite 4-4-4-4, technique 4-7-8
- **Ancrage** - Exercice sensoriel 5-4-3-2-1
- **Exposition graduelle** - Fear ladder en 4 paliers

---

## Utilisation

### Option 1 - Directement dans le navigateur

Telecharger `serein-tcc-act.html` et l'ouvrir dans n'importe quel navigateur moderne. Fonctionne en `file://` sans serveur.

### Option 2 - Heberger soi-meme

Copier le fichier sur n'importe quel hebergement statique (GitHub Pages, Netlify, Vercel...).

### Option 3 - Integrer dans une app

Le fichier est autonome et peut etre charge dans une WebView Android/iOS ou integre dans Capacitor (comme l'app Serein principale).

---

## Design

Les design tokens viennent du repo [Serein](https://github.com/psychocaesar/Serein) :

| Token | Dark | Light |
|---|---|---|
| `--color-bg` | `#0d1b15` | `#f4f2ec` |
| `--color-primary` | `#93c9ac` | `#2f6b50` |
| `--color-primary-2` | `#d8b78a` | `#c0883e` |
| `--color-text` | `#f0f4f0` | `#1b2a20` |

Typographie : **Bricolage Grotesque** (titres) + **Hanken Grotesk** (corps), via Google Fonts.

---

## Contraintes techniques

- Single HTML file - CSS et JS entierement inline
- Zero dependance externe ni reseau (polices embarquees en base64, offline complet)
- Fonctionne sans serveur (`file://`)
- Mobile-first, max-width 480px centre
- Dark mode par defaut, light mode disponible
- Donnees persistees en `localStorage` uniquement (aucune donnee envoyee)
- Accessible : `aria-label` sur tous les elements interactifs

---

## Feuille de route

Idees d'ameliorations futures :

- Cartes de coping personnalisees (comme What's Up?)
- Tracker d'habitudes positives/negatives
- Exercice PMR (relaxation musculaire progressive)
- Service Worker pour mode offline complet

---

## Application mobile (Capacitor)

La PWA est aussi empaquetee en application native iOS et Android via [Capacitor](https://capacitorjs.com/). Le fichier `serein-tcc-act.html` reste la source unique : un script genere le dossier `www/` (webDir) consomme par Capacitor.

### Structure

| Element | Role |
|---|---|
| `serein-tcc-act.html` | Source unique (aussi servie en PWA) |
| `assets/*.mp3` | Sons de coherence cardiaque empaquetes (offline) |
| `scripts/build-www.mjs` | Genere `www/` (index.html + sons) |
| `capacitor.config.json` | appId `fr.sereinapp.tcc`, webDir `www` |
| `android/`, `ios/` | Projets natifs Capacitor |
| `codemagic.yaml` | CI build iOS (App Store / TestFlight) |

### Plugins

- `@capacitor/local-notifications` - rappels des experiences comportementales (3 jours avant + le jour J). Le code web detecte Capacitor et bascule automatiquement sur les notifications natives.

### Developpement

```bash
npm install
npm run sync            # genere www/ puis cap sync (android + ios)

# Android (Android Studio requis)
npm run open:android

# iOS (macOS + Xcode requis)
npm run open:ios
```

A chaque modification de `serein-tcc-act.html`, relancer `npm run sync` avant de builder.

### Build iOS (Codemagic)

Le workflow `codemagic.yaml` build l'IPA sur runner macOS et publie sur TestFlight. Prerequis : enregistrer le bundle id `fr.sereinapp.tcc` sur l'Apple Developer Portal et l'associer a l'integration App Store Connect.

---

## Contribuer

Les contributions sont bienvenues. Lire [CONTRIBUTING.md](CONTRIBUTING.md) avant de soumettre une PR.

---

## Licence

MIT - voir [LICENSE](LICENSE).

---

## Liens

- App Serein principale : [sereinapp.fr](https://sereinapp.fr)
- Repo Serein : [github.com/psychocaesar/Serein](https://github.com/psychocaesar/Serein)
- Ce repo : [github.com/psychocaesar/Serein-TCC-ACT-](https://github.com/psychocaesar/Serein-TCC-ACT-)
