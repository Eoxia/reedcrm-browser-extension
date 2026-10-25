# 🚀 ReedCRM pour Dolibarr.org – Votre CRM directement dans votre navigateur

L'extension **ReedCRM pour [Dolibarr.org](https://www.dolibarr.org)** pour Google Chrome facilite l'utilisation de votre CRM au quotidien en intégrant ses fonctionnalités directement dans votre navigateur.

Conçue pour simplifier les interactions avec ReedCRM, elle permet de gagner du temps, de fluidifier les échanges et d'améliorer la productivité de vos équipes.

📦 **Module Dolibarr associé sur le DoliStore :** [ReedCRM sur DoliStore](https://www.dolistore.com/product.php?id=576&l=fr) (`https://www.dolistore.com/product.php?id=576&l=fr`)

**Les avantages :**
- Accès simplifié à ReedCRM depuis Chrome.
- Intégration du CRM dans votre environnement de navigation.
- Réduction des manipulations et des tâches répétitives.
- Amélioration de l'efficacité et du suivi commercial.

ReedCRM vous accompagne dans la gestion de votre relation client avec une approche simple, pratique et intégrée à vos outils de travail.

---

## ✨ Fonctionnalités Clés

* 🤝 **Opportunités Commerciales** : Créez, consultez, filtrez et éditez vos opportunités (projets Dolibarr) en direct, avec affectation de commercial et gestion des contacts.
* 🎫 **Tickets Support** : Créez et suivez des tickets d'assistance liés à vos tiers, contacts et projets en un clic.
* 📸 **Capture d'écran annotée** : Capturez l'onglet actif, recadrez, floutez les données sensibles, ajoutez des flèches/textes/puces et joignez l'image directement au ticket ou à l'opportunité.
* 🏢 **Multi-Profils & Multi-Sociétés** : Basculez instantanément entre plusieurs instances ou entités Dolibarr.
* 🔐 **Sécurité Manifest V3** : Connexion sécurisée via l'API REST de Dolibarr et stockage synchronisé des profils.

---

## 🛠 Installation (Mode Développeur)

1. Téléchargez la dernière archive `.zip` depuis la page [Releases](https://github.com/Eoxia/reedcrm-browser-extension/releases) (et décompressez-la) ou clonez ce dépôt.
2. Ouvrez un navigateur basé sur Chromium (`chrome://extensions/`, `edge://extensions/`, `brave://extensions/`).
3. Activez le **Mode développeur** (en haut à droite).
4. Cliquez sur **Charger l'extension non empaquetée** (*Load unpacked*) et sélectionnez le **dossier racine** contenant le fichier `manifest.json`.

---

## ⚙️ Configuration (Première connexion)

À la première ouverture du popup ReedCRM :

1. **Lien vers votre Dolibarr** : Saisissez l'URL de votre instance (ex: `https://votre-dolibarr.com` — l'endpoint `/api/index.php` est détecté automatiquement).
2. **Identifiant (Login)** : Votre identifiant utilisateur Dolibarr.
3. **Mot de passe ou Clé API** : Votre mot de passe ou votre clé API REST (`DOLAPIKEY`).
4. Cliquez sur **Tester et connecter**.

Pour des réglages avancés (multi-profils, entité MultiCompany, dictionnaire d'origines, format des captures), cliquez sur **Paramètres avancés**.

---

## 📂 Structure du Projet

```text
/
├── _locales/           # Fichiers de traduction i18n (fr, en, es, de, it)
├── docs/               # Documentation technique (Architecture, Règles, Release, ADR)
├── src/
│   ├── background/     # Service Worker Manifest V3 (requêtes API & contournement CORS)
│   ├── content/        # Scripts injectés (capture de sélection & éditeur d'image in-page)
│   ├── services/       # Services partagés
│   └── utils/          # Constantes, gestionnaire d'erreurs et utilitaires i18n
├── ui/
│   ├── components/     # Composants UI réutilisables (CustomSelect)
│   ├── options/        # Page de configuration et diagnostic des droits Dolibarr
│   └── popup/          # Interface principale (Tickets, Opportunités, Pièces jointes)
└── manifest.json       # Manifeste de l'extension (Manifest V3)
```

---

## 🤝 Contribution

Les contributions sont les bienvenues ! Consultez `CONTRIBUTING.md` et `docs/PROJECT_RULES.md` pour les conventions de branches et de commits.

---

## 📄 Licence

Distribué sous la licence **GPL-3.0**. Voir le fichier `LICENSE` pour plus d'informations.
