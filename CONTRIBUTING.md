# Guide de Contribution (ReedCRM Extension)

Ce document décrit le flux de travail pour toute personne souhaitant contribuer au dépôt `reedcrm-browser-extension`.

## 1. Mise en Place Locale (Setup)

L'extension fonctionne de manière autonome (sans compilation complexe) via le standard Manifest V3.

1. **Cloner le dépôt** :
   ```bash
   git clone git@github.com:Eoxia/reedcrm-browser-extension.git
   cd reedcrm-browser-extension
   ```
2. **Charger l'extension dans le navigateur** :
   - Ouvrez Google Chrome et accédez à `chrome://extensions/`.
   - Cochez "Mode développeur".
   - Cliquez sur "Charger l'extension non empaquetée" et sélectionnez le dossier racine du dépôt.

## 2. Règle des Branches

La branche principale (`main`) est strictement protégée. **Il est formellement interdit de commiter directement sur `main`.**

Créez toujours une branche dédiée pour votre travail, nommée selon le motif : `{type}/{issue-number}-{description-courte}`.
Exemples :
- `feat/123-ajout-filtre-opportunites`
- `fix/404-correction-affichage-popup`
- `chore/88-mise-a-jour-docs`

## 3. Workflow Quotidien

1. Assurez-vous que votre branche est à jour avec `main`.
2. Développez votre fonctionnalité en local (Testez régulièrement en cliquant sur l'icône Actualiser dans `chrome://extensions/`).
3. Effectuez des commits fréquents et explicites en respectant le format _Conventional Commits_ (`feat: ...`, `fix: ...`).

## 4. Tests

Avant de soumettre vos modifications :
- Vérifiez qu'il n'y a pas d'erreurs (`console.error`) dans le Service Worker (cliquez sur "Service worker" dans `chrome://extensions/`).
- Vérifiez qu'il n'y a pas d'erreurs dans la console du Popup (Clic droit sur l'icône > Inspecter le pop-up).
- Testez que les permissions minimales définies dans `manifest.json` n'entraînent pas de blocage inattendu.

## 5. Pull Requests (PR) & Code Review

Une fois votre branche poussée sur GitHub :
1. Ouvrez une Pull Request (PR) vers la branche `main`.
2. Remplissez la description en indiquant clairement ce qui a été fait, pourquoi, et mentionnez le numéro de l'issue liée (`Closes #123`).
3. Assignez un membre de l'équipe pour la relecture (Review).
4. La PR ne peut être "Mergée" (fusionnée) qu'après avoir été approuvée par au moins un reviewer.
