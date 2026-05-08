# Release Process (ReedCRM Extension)

Ce document détaille les étapes nécessaires pour la création et le déploiement d'une nouvelle version de l'extension ReedCRM.

## 1. Préparation de la Release

1. **Vérification des tests locaux** : S'assurer que les appels API, l'interface graphique (popup), et le stockage fonctionnent correctement (chrome.storage).
2. **Mise à jour de la version** :
   - Ouvrir `manifest.json`.
   - Mettre à jour la clé `"version": "X.Y.Z"` selon la gestion sémantique (Major.Minor.Patch).
3. **Rédaction du Changelog** :
   - Lister les changements (Nouvelles fonctionnalités, Corrections de bugs, Améliorations) depuis le dernier tag Git.
4. **Validation de sécurité** :
   - Vérifier qu'aucune nouvelle API non documentée n'est ajoutée.
   - S'assurer que le fichier zip généré ne contient pas de fichiers inutiles (`.git/`, `.gitignore`, `docs/`, `agent.md`).

## 2. Empaquetage (Build)

1. Créer une archive ZIP propre du dépôt contenant :
   - Le fichier `manifest.json` à la racine de l'archive.
   - Le dossier `_locales/`.
   - Le dossier `assets/` (icônes).
   - Les dossiers de code métier (`src/`, `ui/`).
2. S'assurer que le poids de l'archive est minimal (généralement < 1 Mo).

## 3. Publication (Chrome Web Store)

1. Accéder au [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole/).
2. Sélectionner l'extension **ReedCRM**.
3. Aller dans "Package" et uploader la nouvelle archive ZIP.
4. Remplir ou mettre à jour les descriptions dans "Fiche du magasin" si des nouveautés majeures sont présentes.
5. Soumettre pour examen (La révision par Google peut prendre de 24h à plusieurs jours en cas d'utilisation de permissions spécifiques comme `activeTab` et `scripting`).

## 4. Publication sur GitHub

1. Créer une **Release** depuis l'interface de GitHub ou via `gh release create vX.Y.Z`.
2. Inclure le fichier `.zip` dans les assets de la release.
3. Publier la Release avec les notes du Changelog.
