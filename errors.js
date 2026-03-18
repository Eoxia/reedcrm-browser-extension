// Dictionnaire standardisé des erreurs Doli-ReedCRM
const ERROR_DICTIONARY = {
    // ---- Catégorie : API & Réseau (Série 1000) ----
    'ReedCRM-1001': {
        category: 'Réseau',
        userMessage: 'Impossible de joindre le serveur Dolibarr. Vérifiez votre connexion internet ou que l\'URL configurée est accessible.'
    },
    'ReedCRM-1002': {
        category: 'Authentification',
        userMessage: 'Identifiant ou mot de passe/token invalide. Veuillez vérifier vos accès dans les options.'
    },
    'ReedCRM-1003': {
        category: 'Permissions',
        userMessage: 'Votre utilisateur Dolibarr n\'a pas les droits nécessaires pour effectuer cette action (Erreur 403).'
    },
    'ReedCRM-1004': {
        category: 'Ressource Introuvable',
        userMessage: 'La ressource demandée n\'existe pas (Erreur 404). Vérifiez que le module API REST est bien activé sur Dolibarr.'
    },
    'ReedCRM-1500': {
        category: 'Serveur Dolibarr (Erreur Interne)',
        userMessage: 'Dolibarr a rencontré une erreur grave (Erreur 500) et a interrompu la requête. Il manque souvent un champ obligatoire (Configuration Tickets) ou un module tiers (ex: Digirisk) a provoqué un plantage PHP.'
    },
    
    // ---- Catégorie : Configuration (Série 2000) ----
    'ReedCRM-2001': {
        category: 'Configuration Manquante',
        userMessage: 'L\'URL de Dolibarr n\'est pas configurée. Veuillez ouvrir les options de l\'extension.'
    },
    'ReedCRM-2002': {
        category: 'Configuration Manquante',
        userMessage: 'Le Token API de Dolibarr est introuvable. Veuillez vous reloguer dans les options.'
    },

    // ---- Catégorie : Validation Formulaire (Série 3000) ----
    'ReedCRM-3001': {
        category: 'Validation',
        userMessage: 'Le sujet (Titre) du ticket est obligatoire pour valider la création.'
    },
    'ReedCRM-3002': {
        category: 'Validation',
        userMessage: 'Le nom du contact, de l\'entreprise (Tiers), et le titre de l\'opportunité sont obligatoires.'
    },

    // ---- Défaut ----
    'ReedCRM-9999': {
        category: 'Erreur Inconnue',
        userMessage: 'Une erreur inattendue et non répertoriée s\'est produite dans l\'extension.'
    }
};

/**
 * Classe standardisée pour gérer toutes les erreurs de l'extension.
 */
class DoliError extends Error {
    constructor(code, originalError = null, context = {}) {
        const errorDef = ERROR_DICTIONARY[code] || ERROR_DICTIONARY['ReedCRM-9999'];
        super(errorDef.userMessage);
        
        this.name = 'DoliError';
        this.code = code;
        this.category = errorDef.category;
        this.userMessage = errorDef.userMessage;
        
        // Extraction du message technique si c'est un objet Error ou un texte brut (ex HTML d'erreur 500)
        if (originalError) {
            this.technicalMessage = (typeof originalError === 'object' && originalError.message) ? originalError.message : String(originalError);
        } else {
            this.technicalMessage = "Aucun détail technique fourni.";
        }
        
        this.context = context; 

        // Extraction du fichier et de la ligne depuis la Stack Trace
        this.callerInfo = "Origine inconnue";
        if (this.stack) {
            const stackLines = this.stack.split('\n');
            for (let i = 1; i < stackLines.length; i++) {
                // On cherche la première ligne de stack qui ne vient pas de 'errors.js'
                if (stackLines[i] && !stackLines[i].includes('errors.js')) {
                    // Regex pour extraire "nomfichier.js:Ligne" d'une URL chrome-extension://...
                    const match = stackLines[i].match(/\/([^\/]+\.js):(\d+):\d+/);
                    if (match) {
                        this.callerInfo = `${match[1]} - L${match[2]}`;
                    }
                    break;
                }
            }
        }
    }

    /**
     * Génère le bloc HTML standardisé pour afficher l'erreur à l'utilisateur.
     * @returns {string} Le code HTML de la boîte d'erreur
     */
    toHTML() {
        let detailsHtml = '';
        if (this.technicalMessage && this.technicalMessage.trim() !== '') {
            // Échapper l'HTML brut provenant du serveur pour éviter de casser l'affichage (XSS basique)
            const safeTechMessage = this.technicalMessage.replace(/</g, "&lt;").replace(/>/g, "&gt;");
            
            detailsHtml = `
            <details class="doli-error-details">
                <summary>Voir les détails techniques</summary>
                <div style="margin-top: 8px; margin-bottom: 4px; font-weight: bold; color: #555;">📍 Origine : ${this.callerInfo}</div>
                <pre>${safeTechMessage}</pre>
                ${this.context && Object.keys(this.context).length > 0 ? `<pre>Contexte: ${JSON.stringify(this.context, null, 2)}</pre>` : ''}
            </details>`;
        }

        return `
        <div class="doli-error-box">
            <div class="doli-error-header">
                <strong>[${this.code}] ${this.category}</strong>
            </div>
            <div class="doli-error-body">
                ${this.userMessage}
            </div>
            ${detailsHtml}
        </div>`;
    }
}

// Fonction utilitaire pour faciliter l'affichage
function showDoliError(errorObject, domElement) {
    if (errorObject instanceof DoliError) {
        domElement.innerHTML = errorObject.toHTML();
    } else {
        // Fallback catch-all if a random Error is thrown instead of DoliError
        const fallback = new DoliError('ReedCRM-9999', errorObject);
        domElement.innerHTML = fallback.toHTML();
    }
}
