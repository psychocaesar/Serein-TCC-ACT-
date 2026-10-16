# Captures des stores — Serein Relais

Prises dans le simulateur iOS avec des données d'exemple (aucune donnée réelle), barre d'état figée à 9:41.

- `ios-6.9/` : App Store, format 6,9 pouces (iPhone 17 Pro Max, 1320 × 2868). Apple réduit lui-même ce format pour les tailles d'écran plus petites.
- `google-play/` : mêmes écrans, élargis à 1440 × 2868 avec la couleur de fond de l'app, pour respecter la règle de Google Play (le grand côté ne doit pas dépasser deux fois le petit).

Ordre proposé : 01 Aujourd'hui, 02 Exercices, 03 fin du journal (nouvelle cotation), 04 Mon carnet, 05 plan anti-rechute, 06 Mon suivi, 07 SOS.

Pour les refaire : `site/outils/seed_plist.py` écrit les données d'exemple dans les Preferences natives de l'app installée sur le simulateur (avant son premier lancement), puis `xcrun simctl io <appareil> screenshot`.
