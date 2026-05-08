# Règles du Projet & Workflow (ReedCRM Extension)

## 1. Setup Local

L'extension ne nécessite aucun processus de `build` complexe type Webpack ou Vite. Il s'agit de HTML, CSS et Vanilla JS standards supportés par le navigateur.

1. Clonez le dépôt.
2. Ouvrez Google Chrome / Brave / Edge.
3. Allez sur `chrome://extensions/`.
4. Activez le **Mode Développeur** en haut à droite.
5. Cliquez sur **Charger l'extension non empaquetée** et sélectionnez le dossier racine de l'extension.

## 2. Développement Quotidien

- **Rafraîchissement** : Chaque fois que vous modifiez un fichier JS ou HTML, cliquez sur le bouton "Actualiser" (flèche en boucle) sur la carte de l'extension dans `chrome://extensions/`.
- **Débogage du Service Worker** : Cliquez sur "Service worker" sur la carte de l'extension pour ouvrir une console DevTools dédiée au script d'arrière-plan.
- **Débogage du Popup** : Faites un clic-droit sur l'icône de l'extension dans la barre d'outils et sélectionnez "Inspecter le pop-up".

## 3. Workflow Git

1. **Une Feature = Une Branche** : Ne jamais travailler directement sur `main`.
2. Format des branches : `{type}/{issue-number}-{description}`
   - Exemple : `feat/102-ajout-opportunite` ou `fix/15-bug-affichage`
3. Ouvrir une **Pull Request (PR)** vers `main` pour toute modification.
4. Messages de commit au format Conventional Commits (`fix: ...`, `feat: ...`, `chore: ...`).

## 4. Intégration Continue (CI)

*(À définir selon le repo GitHub de l'équipe Eoxia)*
Si applicable, une action GitHub vérifie la conformité JavaScript (JSHint, ESLint) et construit les paquets ZIP de déploiement à chaque publication de release.

## 5. Contraintes Spécifiques (Manifest V3)

- **Pas d'utilisation de CDN ou librairies distantes** via `<script src="https://...">`. Tout le code doit être localisé dans l'extension (exigence de sécurité Google Web Store).
- **Versioning** : Mettre systématiquement à jour la clé `"version"` dans `manifest.json` lors de chaque publication majeure/mineure pour permettre les mises à jour automatiques via les stores.
