# Architecture Globale (ReedCRM Browser Extension)

Ce document décrit l'architecture haut niveau de l'extension de navigateur ReedCRM, conçue pour être compatible Manifest V3 (Chrome, Edge, Firefox).

## 1. Vision Globale

L'extension ReedCRM agit comme un pont direct entre la navigation web quotidienne de l'utilisateur et le CRM Dolibarr (via son API REST). L'objectif est d'offrir une interface légère, instantanée et non-intrusive (un popup) permettant de consulter ses tickets et de créer des opportunités sans quitter l'onglet courant.

## 2. Séparation des Responsabilités

L'architecture est découpée en trois strates distinctes imposées par Manifest V3 :

- **Background (Service Worker)** : Éphémère (se coupe après 30s d'inactivité). Gère la communication externe (requêtes API) de manière sécurisée pour éviter les problèmes de CORS présents dans le contexte de la page web.
- **UI (Popup & Options)** : Les vues HTML/CSS/JS isolées de la page web courante. C'est l'interface principale de l'extension. Le code y est réactif et purement événementiel (Vanilla JS).
- **Content Scripts** : Scripts injectés dans la page web de l'utilisateur. Ils ne contiennent aucune logique métier : ils se contentent de lire le DOM (ex: capturer du texte sélectionné) et de le transmettre au Service Worker ou au Popup.

## 3. Structure du Dépôt

```
/
├── _locales/           # Traductions (FR, EN, etc.) i18n
├── assets/             # Images et icônes
├── docs/               # Documentation interne (Architecture, Règles, ADR)
├── src/
│   ├── background/     # Service worker (exécuteur de requêtes)
│   ├── content/        # Content scripts injectés (ex: éditeur in-page)
│   ├── services/       # Services partagés (accès au store)
│   └── utils/          # Constantes et fonctions utilitaires
├── ui/
│   ├── options/        # Page de configuration (Tokens, URLs)
│   └── popup/          # Le popup principal (HTML/CSS/JS)
```

## 4. Concepts Clés & Flux de Données

1. **Pas d'état global persistant en RAM** : Le Service Worker s'endormant régulièrement, l'état global (liste de tickets, formulaires non sauvegardés) est systématiquement sauvegardé via `chrome.storage.local`.
2. **Messagerie inter-scripts** : L'extension repose sur une communication par événements. Le Popup demande des données via `chrome.runtime.sendMessage()`, le Service Worker écoute, exécute l'appel API, puis retourne la promesse résolue au Popup.
3. **Capture d'écran et annotation** : L'extension intègre une fonctionnalité complexe de capture d'écran de l'onglet actif. La capture est encodée en base64, envoyée à un canvas injecté (via le `content script`), annotée par l'utilisateur, puis renvoyée au Popup avant d'être envoyée à Dolibarr via API.
