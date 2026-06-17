# Contribuer a Serein TCC·ACT

Merci de l'interet pour ce projet. Voici comment contribuer efficacement.

---

## Avant de commencer

Ce projet traite de sante mentale. Toute contribution doit respecter ces principes :

- **Ne pas medicaliser** - l'outil est un complement, pas un dispositif medical
- **Conserver le disclaimer** - ne jamais supprimer ou affaiblir l'avertissement "ne remplace pas un suivi therapeutique"
- **Privilegier la simplicite** - l'utilisateur est potentiellement en detresse, l'UX doit rester claire et rassurante
- **Offline-first** - aucune donnee ne doit quitter le navigateur

---

## Types de contributions bienvenues

- Corrections de bugs ou de fautes
- Ameliorations d'accessibilite (ARIA, contraste, taille des zones tactiles)
- Nouveaux exercices TCC/ACT documentés scientifiquement
- Traductions
- Optimisations de performance (le fichier doit rester single-file)

## Ce qui n'est pas accepte

- Dependances externes supplementaires (sauf Google Fonts deja presente)
- Fonctionnalites necessitant un compte utilisateur ou un serveur
- Analytics, trackers, publicite
- Contenu non valide cliniquement

---

## Workflow

1. **Forker** le repo et creer une branche depuis `main`
2. Nommer la branche de facon explicite : `feat/breathing-pmr`, `fix/aria-checkin`, etc.
3. **Tester** le fichier en local en `file://` dans Chrome, Firefox et Safari mobile
4. Verifier l'accessibilite de base (navigation clavier, lecteur d'ecran)
5. Ouvrir une **Pull Request** avec une description claire de la modification et sa justification clinique si applicable

---

## Conventions de code

Le projet est intentionnellement un single-file HTML. Pas de bundler, pas de transpileur.

- **CSS** : variables CSS pour toutes les couleurs (utiliser les tokens existants)
- **JS** : vanilla ES6+, pas de framework
- **HTML** : `aria-label` sur tous les boutons et champs interactifs
- **Tirets** : utiliser `-` (trait d'union simple), jamais `--` ni les tirets longs
- **Commentaires** : uniquement si le comportement est non-evident

---

## Signaler un probleme

Ouvrir une issue GitHub avec :

- La description du probleme
- Le navigateur et l'OS utilises
- Une capture d'ecran si pertinent

Pour les questions de contenu clinique (exactitude d'un exercice TCC/ACT), mentionner la source ou la reference.

---

## Questions

Ouvrir une issue avec le label `question`.
