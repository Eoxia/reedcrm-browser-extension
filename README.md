# 🚀 ReedCRM : Extension Navigateur pour Dolibarr

**ReedCRM Extension** est l'outil indispensable pour connecter votre navigation Web directement à votre instance **Dolibarr ERP/CRM**. Gagnez du temps en accédant à vos données clients et en automatisant vos tâches CRM sans quitter votre onglet actif.

---

## ✨ Fonctionnalités Clés

* 🎫 Ticket Support : Créez un ticket d'assistance ou une demande client en un clic.
* 🔐 **Sécurité :** Connexion sécurisée via l'API REST de Dolibarr.

## ✨ Fonctionnalités à venir

* 🔍 **Recherche Rapide :** Trouvez un tiers, un contact ou une facture en un clic.
* 📅 **Gestion d'Agenda :** Visualisez vos événements Dolibarr en temps réel.
* 📥 **Capture de Données :** Créez des prospects ou des contacts à partir de n'importe quelle page Web.
* 🔔 **Notifications :** Restez informé de vos rappels et interventions.

---

## 🛠 Installation

### Pour Chrome / Edge / Brave / Opera

1. Téléchargez la dernière version `.zip` sur la page [Releases](https://www.google.com/search?q=).
2. Allez sur `chrome://extensions/`.
3. Activez le **Mode développeur** (en haut à droite).
4. Cliquez sur **Charger l'extension décompressée** et sélectionnez le dossier `chrome/`.

### Pour Firefox

1. Téléchargez le fichier `.xpi` sur la page à venir
2. Allez sur `about:addons`.
3. Cliquez sur la roue crantée ⚙️ et sélectionnez **Installer un module depuis un fichier...**.

---

## ⚙️ Configuration

Une fois installée, ouvrez l'extension et renseignez les informations suivantes :

1. **URL de votre Dolibarr :** `https://votre-dolibarr.com`
2. **Clé API :** (Générée dans votre fiche utilisateur Dolibarr > Onglet API Dashboard).

---

## 📂 Structure du Projet

Ce dépôt utilise une structure unique pour supporter tous les navigateurs :

* `/common` : Code source JavaScript (Vanille), CSS et HTML partagé.
* `/icons` : Logos officiels ReedCRM.
* `/chrome` : Manifest spécifique pour les navigateurs basés sur Chromium (V3).
* `/firefox` : Manifest spécifique pour Mozilla Firefox (V2/V3).

---

## 🤝 Contribution

Les contributions sont les bienvenues ! Pour proposer une amélioration :

1. Forkez le projet.
2. Créez votre branche (`git checkout -b feature/AmazingFeature`).
3. Committez vos changements (`git commit -m 'Add some AmazingFeature'`).
4. Pushez sur la branche (`git push develop feature/AmazingFeature`).
5. Ouvrez une Pull Request.

---

## 📄 Licence

Distribué sous la licence **GPL-3.0**. Voir le fichier `LICENSE` pour plus d'informations.

---

> **Note :** Cette extension est développée par l'équipe ReedCRM et n'est pas affiliée officiellement à l'association Dolibarr.

---
