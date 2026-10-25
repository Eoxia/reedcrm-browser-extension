# Chrome Web Store Listing — ReedCRM

> Last Updated: 2026-10-25

## Store Listing

**Extension Name** [REQUIRED]
ReedCRM

**Short Description** [REQUIRED]
ReedCRM pour Dolibarr.org – Votre CRM directement dans votre navigateur. Gagnez du temps et optimisez votre suivi commercial.

**Detailed Description** [REQUIRED]
ReedCRM pour Dolibarr.org – Votre CRM directement dans votre navigateur

L'extension ReedCRM pour Google Chrome facilite l'utilisation de votre CRM Dolibarr (Dolibarr.org) au quotidien en intégrant ses fonctionnalités directement dans votre navigateur.

Conçue pour simplifier les interactions avec ReedCRM, elle permet de gagner du temps, de fluidifier les échanges et d'améliorer la productivité de vos équipes.

Les avantages :
- Accès simplifié à ReedCRM depuis Chrome.
- Intégration du CRM dans votre environnement de navigation.
- Réduction des manipulations et des tâches répétitives.
- Amélioration de l'efficacité et du suivi commercial.

Fonctionnalités principales :
- Création et suivi rapide d'opportunités commerciales et de prospects.
- Création et consultation de tickets d'assistance associés à vos clients et projets.
- Capture d'écran annotée de l'onglet actif (recadrage, flèches, texte, floutage des données confidentielles) jointe directement à vos tickets ou opportunités.
- Édition rapide en un clic du statut, de la probabilité, du montant ou du commercial assigné.
- Support multi-profils pour basculer entre plusieurs instances Dolibarr.

Module ReedCRM pour Dolibarr.org disponible sur le DoliStore :
https://www.dolistore.com/product.php?id=576&l=fr

ReedCRM vous accompagne dans la gestion de votre relation client avec une approche simple, pratique et intégrée à vos outils de travail.

**Category** [REQUIRED]
Productivity

**Single Purpose** [REQUIRED]
Permet de créer, consulter et mettre à jour des opportunités commerciales et des tickets d'assistance dans une instance CRM Dolibarr (Dolibarr.org) directement depuis le navigateur.

**Primary Language** [REQUIRED]
Français (fr)

---

## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|-------|-----------|--------|----------|
| Store Icon [REQUIRED] | 128×128 PNG | ✅ Ready | `icon128.png` |
| Toolbar Icon | 32×32 PNG | ✅ Ready | `icon32.png` |
| High-DPI Icon | 192×192 PNG | ✅ Ready | `icon192.png` |
| Screenshot 1 [REQUIRED] | 1280×800 or 640×400 | 🟡 À fournir sur le Dashboard | Vue Création / Liste des Opportunités |
| Screenshot 2 [RECOMMENDED] | 1280×800 or 640×400 | 🟡 À fournir sur le Dashboard | Vue Création / Liste des Tickets |
| Screenshot 3 [RECOMMENDED] | 1280×800 or 640×400 | 🟡 À fournir sur le Dashboard | Éditeur de capture d'écran annotée |

---

## Permissions Justification (Prêt à copier-coller dans l'onglet Confidentialité du Chrome Web Store)

| Permission | Type | Justification (FR / EN pour l'équipe de revue Google) |
|------------|------|-------------------------------------------------------|
| `storage` | `permissions` | **FR :** Nécessaire pour enregistrer la configuration de connexion au serveur Dolibarr de l'utilisateur (`chrome.storage.sync`) ainsi que les brouillons de formulaires en cours de saisie (`chrome.storage.local`) afin d'éviter toute perte de données à la fermeture du popup.<br>**EN :** Used to store the user's Dolibarr CRM connection settings (`chrome.storage.sync`) and temporary form drafts (`chrome.storage.local`) so users do not lose unsaved ticket or opportunity inputs when the popup closes. |
| `unlimitedStorage` | `permissions` | **FR :** Nécessaire pour stocker temporairement en local (`chrome.storage.local`) les captures d'écran haute résolution et pièces jointes en attente d'envoi vers le CRM Dolibarr lorsque l'utilisateur annote une capture d'écran sur la page.<br>**EN :** Required to temporarily hold high-resolution screenshots and file attachments in `chrome.storage.local` while the user annotates a screenshot in the in-page editor before uploading it to their Dolibarr CRM. |
| `activeTab` | `permissions` | **FR :** Utilisé uniquement lorsque l'utilisateur clique sur le bouton « Capturer » pour réaliser une capture d'écran visible de l'onglet actif (`chrome.tabs.captureVisibleTab`) afin de la joindre à un ticket ou une opportunité.<br>**EN :** Used only when the user clicks the "Capture" button to take a screenshot of the currently active tab (`chrome.tabs.captureVisibleTab`) and attach it to a support ticket or commercial opportunity. |
| `scripting` | `permissions` | **FR :** Utilisé pour injecter à la demande l'éditeur d'annotation de capture d'écran (`content.js` / `content.css`) dans l'onglet actif si l'onglet était déjà ouvert avant l'installation ou la mise à jour de l'extension.<br>**EN :** Used to dynamically inject the screenshot annotation editor (`content.js` and `content.css`) into the active tab when the user initiates a screenshot on a tab that was opened prior to the extension installation or reload. |
| `<all_urls>` | `content_scripts` / `host_permissions` | **FR :** L'extension permet à l'utilisateur de sélectionner du texte (sujet, coordonnées d'un prospect depuis un webmail ou site client) et d'annoter une capture d'écran sur n'importe quelle page web professionnelle qu'il consulte, ainsi que de se connecter à l'URL de sa propre instance Dolibarr auto-hébergée.<br>**EN :** Required because users connect the extension to their own self-hosted Dolibarr CRM domain (which varies per company) and use the in-page screenshot annotation editor and text-selection capture on any webmail or customer webpage they visit. |

---

## Privacy & Data Use (Formulaire de déclaration de confidentialité CWS)

### Data Collection

**Does the extension collect user data?**
Les données saisies (URL Dolibarr, clé API Dolibarr, tickets, opportunités, captures d'écran) transitent **exclusivement** entre le navigateur de l'utilisateur et sa propre instance Dolibarr configurée (ainsi que `chrome.storage.sync` pour la synchronisation du profil Chrome de l'utilisateur). Aucun serveur tiers ni outil d'analytics externe n'est utilisé par l'éditeur de l'extension.

| Data Type | Collected / Transmitted to User's CRM? | Purpose | Shared with Third Parties? |
|-----------|----------------------------------------|---------|---------------------------|
| Authentication info | Oui (Clé API / Token Dolibarr stocké dans `chrome.storage.sync`) | Authentifier les requêtes API REST vers le serveur Dolibarr de l'utilisateur | Non |
| Personally identifiable info | Oui (Nom, prénom, email, téléphone des contacts saisis par l'utilisateur) | Créer ou mettre à jour des opportunités et tickets dans le Dolibarr de l'utilisateur | Non |
| Website content | Oui (Uniquement le texte sélectionné ou la capture d'écran déclenchée par l'utilisateur) | Pré-remplir un ticket/opportunité ou joindre une capture d'écran dans Dolibarr | Non |
| Health / Financial / Location / Web history | Non | N/A | Non |

### Data Use Certification
- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes

---

## Developer & Support Info

- **Publisher Name**: Eoxia / ReedCRM
- **Homepage URL**: `https://reedcrm.com`
- **Support URL**: `https://github.com/Eoxia/reedcrm-browser-extension/issues`
- **DoliStore Module**: `https://www.dolistore.com/product.php?id=576&l=fr`

---

## Version History

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| `23.0.3` | 2026-10-25 | Onboarding première connexion, badge commercial sur opportunités, pagination complète des tiers (#50), suppression du suivi RH, correction dimensions `icon128.png` (128×128), workflow CI/CD GitHub Actions (#52). | Ready for submission |
| `22.0.0` | 2026-07-05 | Édition inline des tickets et opportunités, filtres rapides, pièces jointes multiples. | Published |
