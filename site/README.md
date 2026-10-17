# Site — sereinapp.fr/relais

Page de présentation de Serein Relais, à déposer dans `/home/pi/sereinapp-landing/relais/` sur le serveur (le reste de sereinapp.fr n'est pas dans ce repo).

- `relais/index.html` : reprend le CSS, la navigation, les polices et le pied de page de la landing Serein (chemins `../assets/…`). **Ne pas publier avant la sortie de l'app** ; à la sortie, remplacer les badges « Bientôt » par les liens des stores.
- `relais/privacy.html` : copie de `privacy.html` (racine du repo) avec un lien retour et une icône adaptés au site. À régénérer après toute modification de `privacy.html`. Seule page publiée avant la sortie (URL exigée par les stores).
- `relais/img/` : captures de l'app (720 px de large), prises avec des données d'exemple.
- `relais/img/og-relais.png` : image de partage (1200 × 630), générée depuis `outils/og-relais.html` avec `outils/og-render.cjs` (Playwright).
- `landing-liens-relais.patch` : liens vers Relais à ajouter sur la landing Serein (pied de page et bloc « pro » de l'accueil, section dédiée sur `pro/`). **À appliquer seulement à la sortie**, sur une copie fraîche du serveur : `patch -p1 -d /home/pi/sereinapp-landing < landing-liens-relais.patch` (après une sauvegarde dans `.backups/`, comme d'habitude).
- `stores/` : captures pour l'App Store et Google Play.
