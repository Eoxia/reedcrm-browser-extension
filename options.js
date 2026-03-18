// Fonction pour tester la connexion à l'API Dolibarr
async function testDolibarrConnection(apiUrl, login, passwordOrToken, entity) {
    try {
        let token = passwordOrToken;
        let authSuccess = false;
        let apiTokenFinal = passwordOrToken;

        const baseHeaders = {
            'Accept': 'application/json'
        };
        if (entity && entity.trim() !== '') {
            baseHeaders['DOLAPIENTITY'] = entity.trim();
        }

        // 1. Test d'authentification (Récupération du token ou validation de la clé API)
        const loginResponse = await fetch(`${apiUrl}/login?login=${encodeURIComponent(login)}&password=${encodeURIComponent(passwordOrToken)}`, {
            method: 'POST',
            headers: baseHeaders
        });

        if (loginResponse.ok) {
            const data = await loginResponse.json();
            apiTokenFinal = data.success ? data.success.token : null;
            authSuccess = true;
        } else {
            const testKeyResponse = await fetch(`${apiUrl}/status`, {
                headers: { ...baseHeaders, 'DOLAPIKEY': passwordOrToken }
            });
            if (testKeyResponse.ok) {
                authSuccess = true;
            }
        }

        if (!authSuccess) {
            return { success: false, error: new DoliError('ReedCRM-1002') };
        }

        // 2. Test spécifique : Permission de lecture des utilisateurs et des tickets
        let canReadUsers = false;
        let canReadTickets = false;
        let canReadThirdparties = false;
        let canReadProjects = false;
        let canReadGed = false;
        let hasGedPR37499 = false;
        try {
            // Test super-tolérant : Utilisateurs
            const usersResponse = await fetch(`${apiUrl}/users?limit=1`, {
                method: 'GET',
                headers: { ...baseHeaders, 'DOLAPIKEY': apiTokenFinal }
            });
            if (usersResponse.status !== 403 && usersResponse.status !== 401) {
                canReadUsers = true;
            }

            // Test super-tolérant : Tickets
            const ticketsResponse = await fetch(`${apiUrl}/tickets?limit=1`, {
                method: 'GET',
                headers: { ...baseHeaders, 'DOLAPIKEY': apiTokenFinal }
            });
            if (ticketsResponse.status !== 403 && ticketsResponse.status !== 401) {
                canReadTickets = true;
            }

            // Test super-tolérant : Tiers (262)
            const thirdpartiesResponse = await fetch(`${apiUrl}/thirdparties?limit=1`, {
                method: 'GET',
                headers: { ...baseHeaders, 'DOLAPIKEY': apiTokenFinal }
            });
            if (thirdpartiesResponse.status !== 403 && thirdpartiesResponse.status !== 401) {
                canReadThirdparties = true;
            }

            // Test super-tolérant : Projets (41)
            const projectsResponse = await fetch(`${apiUrl}/projects?limit=1`, {
                method: 'GET',
                headers: { ...baseHeaders, 'DOLAPIKEY': apiTokenFinal }
            });
            if (projectsResponse.status !== 403 && projectsResponse.status !== 401) {
                canReadProjects = true;
            }

            // Test super-tolérant : Droit d'accès aux documents (GED)
            const gedResponse = await fetch(`${apiUrl}/documents?modulepart=ticket&id=1`, {
                method: 'GET',
                headers: { ...baseHeaders, 'DOLAPIKEY': apiTokenFinal }
            });

            if (gedResponse.status !== 403 && gedResponse.status !== 401) {
                canReadGed = true;
            }

            // Test PR 37499 : Vérification que le modulepart 'ticket' est supporté par l'API POST /documents/upload
            // Si le PR est absent : renvoie 500 "Modulepart ticket not implemented yet."
            // Si le PR est présent : la classe Ticket est chargée, mais le ticket "99999999" n'existe pas, renvoyant 404.
            const prResponse = await fetch(`${apiUrl}/documents/upload`, {
                method: 'POST',
                headers: { ...baseHeaders, 'DOLAPIKEY': apiTokenFinal, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filename: "pr_test.txt",
                    modulepart: "ticket",
                    ref: "99999999", // ID qui n'existe pas
                    filecontent: "dGVzdA==", // base64 "test"
                    fileencoding: "base64"
                })
            });
            
            const prStatus = prResponse.status;
            const prData = await prResponse.text();
            
            // On considère que le PR est là si on obtient un 404 (Object not found), ou 200 (Succès), ou 403 (Accès refusé mais route validée)
            if (prStatus === 404 || prStatus === 200 || prStatus === 403 || prStatus === 401) {
                if (!prData.toLowerCase().includes('not implemented')) {
                    hasGedPR37499 = true;
                }
            }
        } catch (err) {
            console.warn("Erreur lors de la vérification des droits API:", err);
        }

        // 3. Récupérer le nom de l'entreprise/entité
        let entityName = "Inconnue";
        try {
            const companyResponse = await fetch(`${apiUrl}/setup/company`, {
                method: 'GET',
                headers: {
                    ...baseHeaders,
                    'DOLAPIKEY': apiTokenFinal
                }
            });
            if (companyResponse.ok) {
                const companyData = await companyResponse.json();
                if (companyData.name) {
                    entityName = companyData.name;
                }
            }
        } catch (err) {
            console.warn("Erreur chargement nom entreprise:", err);
        }

        return {
            success: true,
            apiToken: apiTokenFinal,
            permissions: {
                users: canReadUsers,
                tickets: canReadTickets,
                thirdparties: canReadThirdparties,
                projects: canReadProjects,
                ged: canReadGed,
                ged_pr: hasGedPR37499
            },
            entityName: entityName
        };

    } catch (e) {
        return { success: false, error: new DoliError('ReedCRM-1001', e) };
    }
}

const DOLI_RIGHTS_DESC = {
    '251': "Utilisateurs - Lire les utilisateurs, les groupes et leurs permissions",
    '262': "Tiers - Étendre l'accès à tous les tiers / Lire les tiers",
    '41': "Lire les projets et les tâches (projets partagés et projets dont je suis un contact).",
    '42': "Créer/modifier des projets (projets partagés et projets dont je suis un interlocuteur).",
    'tickets': "Tickets - Lire et consulter les tickets",
    '541': "GED - Déposer des documents",
    '542': "GED - Consulter les documents"
};

let profiles = [];
let activeProfileId = null;

function getActiveProfile() {
    return profiles.find(p => p.id === activeProfileId) || profiles[0];
}

// Fonction pour générer un ID unique
function generateId() {
    return 'prof_' + Math.random().toString(36).substr(2, 9);
}

// Met à jour les champs du formulaire avec le profil sélectionné
function loadProfileIntoForm(p) {
    if (!p) return;
    document.getElementById('doli-profile-name').value = p.name || '';
    document.getElementById('doli-url').value = p.doliUrl || '';
    document.getElementById('doli-login').value = p.doliLogin || '';
    document.getElementById('doli-password').value = p.doliApiToken || '';
    document.getElementById('doli-entity').value = p.doliEntity || '';
    document.getElementById('doli-auto-assign').checked = p.doliAutoAssign !== false;
    
    if (document.getElementById('doli-opp-only')) {
        document.getElementById('doli-opp-only').checked = p.doliOppOnly !== false;
    }

    document.getElementById('doli-ticket-type').value = p.doliTicketType || 'ISSUE';
    document.getElementById('doli-ticket-severity').value = p.doliTicketSeverity || 'NORMAL';
    document.getElementById('doli-ticket-category').value = p.doliTicketCategory || '';

    // Affichage des permissions si elles existent
    if (p.doliStatus) {
        renderPermissions(p.doliStatus, p.doliUrl);
    } else {
        renderPermissions({ connection: 'pending', users: 'pending', tickets: 'pending', thirdparties: 'pending', projects: 'pending', ged: 'pending', ged_pr: 'pending' }, p.doliUrl);
    }
}

// Met à jour la liste déroulante des profils
function renderProfileSelect() {
    const select = document.getElementById('doli-profile-select');
    select.innerHTML = '';
    profiles.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.name || 'Nouveau Profil';
        if (p.id === activeProfileId) opt.selected = true;
        select.appendChild(opt);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialisation : chargement depuis sync
    chrome.storage.sync.get(null, (items) => {
        
        // --- MIGRATION (si l'ancienne structure existe) ---
        if (items.doliUrl && !items.doliProfiles) {
            const migratedProfile = {
                id: generateId(),
                name: 'Profil par défaut',
                doliUrl: items.doliUrl,
                doliLogin: items.doliLogin,
                doliApiToken: items.doliApiToken,
                doliEntity: items.doliEntity,
                doliAutoAssign: items.doliAutoAssign,
                doliOppOnly: items.doliOppOnly,
                doliTicketType: items.doliTicketType,
                doliTicketSeverity: items.doliTicketSeverity,
                doliTicketCategory: items.doliTicketCategory,
                doliStatus: items.doliStatus
            };
            profiles = [migratedProfile];
            activeProfileId = migratedProfile.id;
            
            // Nettoyage de l'ancienne config
            chrome.storage.sync.remove(['doliUrl', 'doliLogin', 'doliApiToken', 'doliEntity', 'doliAutoAssign', 'doliOppOnly', 'doliTicketType', 'doliTicketSeverity', 'doliTicketCategory', 'doliStatus']);
            chrome.storage.sync.set({ doliProfiles: profiles, doliActiveProfileId: activeProfileId });
        } else {
            profiles = items.doliProfiles || [];
            activeProfileId = items.doliActiveProfileId;
        }

        // --- GESTION DES PROFILS ---
        if (profiles.length === 0) {
            // Création d'un premier profil vide si tout est vide
            const initialProfile = { id: generateId(), name: 'Profil 1' };
            profiles.push(initialProfile);
            activeProfileId = initialProfile.id;
            chrome.storage.sync.set({ doliProfiles: profiles, doliActiveProfileId: activeProfileId });
        }

        if (!activeProfileId || !profiles.find(p => p.id === activeProfileId)) {
            activeProfileId = profiles[0].id; // Fallback
        }

        renderProfileSelect();
        loadProfileIntoForm(getActiveProfile());

        // --- PARAMÈTRES GLOBAUX ---
        if (items.doliImageFormat) {
            document.querySelector(`input[name="doli-format"][value="${items.doliImageFormat}"]`).checked = true;
        }
        if (items.doliDefaultView) {
            document.querySelector(`input[name="doli-default-view"][value="${items.doliDefaultView}"]`).checked = true;
        }
        if (items.doliBlurIntensity) {
            document.getElementById('doli-blur').value = items.doliBlurIntensity;
        }
        if (items.doliRecentCount) {
            document.getElementById('doli-recent-count').value = items.doliRecentCount;
        }
    });

    // --- ÉCOUTEURS D'ÉVÉNEMENTS PROFILS ---
    
    // Changement de profil via le select
    document.getElementById('doli-profile-select').addEventListener('change', (e) => {
        activeProfileId = e.target.value;
        chrome.storage.sync.set({ doliActiveProfileId: activeProfileId });
        loadProfileIntoForm(getActiveProfile());
    });

    // Renommer le profil en direct
    document.getElementById('doli-profile-name').addEventListener('input', (e) => {
        const p = getActiveProfile();
        if (p) {
            p.name = e.target.value;
            // Mettre à jour le texte dans le select sans perdre le focus
            const opt = document.querySelector(`#doli-profile-select option[value="${p.id}"]`);
            if (opt) opt.textContent = p.name || 'Sans nom';
            
            // On sauvegarde en background
            chrome.storage.sync.set({ doliProfiles: profiles });
        }
    });

    // Nouveau Profil
    document.getElementById('btn-new-profile').addEventListener('click', () => {
        const newProfile = { id: generateId(), name: 'Nouveau Profil' };
        profiles.push(newProfile);
        activeProfileId = newProfile.id;
        chrome.storage.sync.set({ doliProfiles: profiles, doliActiveProfileId: activeProfileId });
        
        renderProfileSelect();
        loadProfileIntoForm(newProfile);
    });

    // Supprimer Profil
    document.getElementById('btn-delete-profile').addEventListener('click', () => {
        if (confirm("Voulez-vous vraiment supprimer ce profil ? Toutes ses données seront effacées.")) {
            profiles = profiles.filter(p => p.id !== activeProfileId);
            
            if (profiles.length === 0) {
                // Si plus aucun profil, on en recrée un vide
                const emptyProfile = { id: generateId(), name: 'Profil 1' };
                profiles.push(emptyProfile);
            }
            
            activeProfileId = profiles[0].id;
            chrome.storage.sync.set({ doliProfiles: profiles, doliActiveProfileId: activeProfileId });
            
            renderProfileSelect();
            loadProfileIntoForm(getActiveProfile());
        }
    });

    // Bouton de Test de Connexion
    document.getElementById('btn-test-profile').addEventListener('click', async () => {
        const url = document.getElementById('doli-url').value;
        const login = document.getElementById('doli-login').value;
        const password = document.getElementById('doli-password').value;
        const entityVal = document.getElementById('doli-entity').value.trim();
        const testStatusDiv = document.getElementById('test-status-container');
        const btnTest = document.getElementById('btn-test-profile');
        const statusDashboard = document.getElementById('permissions-dashboard');
        
        if (!url || !login || !password) {
            testStatusDiv.style.color = "#e74c3c";
            testStatusDiv.textContent = 'Veuillez remplir l\'URL, l\'identifiant et le mot de passe avant de tester.';
            return;
        }

        let normalizedUrl = url.trim();
        if (normalizedUrl.endsWith('/')) normalizedUrl = normalizedUrl.slice(0, -1);
        if (!normalizedUrl.endsWith('/api/index.php')) {
            if (normalizedUrl.endsWith('/htdocs')) normalizedUrl += '/api/index.php';
            else if (!normalizedUrl.includes('/api/index.php')) normalizedUrl += '/htdocs/api/index.php';
        }

        btnTest.disabled = true;
        btnTest.textContent = "Test en cours...";
        testStatusDiv.textContent = "";

        statusDashboard.classList.remove('hidden');
        renderPermissions({ connection: 'warning', users: 'warning', tickets: 'warning', thirdparties: 'warning', projects: 'warning', ged: 'warning', ged_pr: 'warning' }, normalizedUrl);

        const testResult = await testDolibarrConnection(normalizedUrl, login, password, entityVal);

        if (testResult.success) {
            testStatusDiv.style.color = "#27ae60";
            let msg = '✅ Connexion réussie !';
            if (testResult.entityName && testResult.entityName !== "Inconnue") {
                msg += ` (🏢 ${testResult.entityName})`;
            }
            testStatusDiv.innerHTML = msg;

            const hasUsers = testResult.permissions && testResult.permissions.users;
            const hasTickets = testResult.permissions && testResult.permissions.tickets;
            const hasThirdparties = testResult.permissions && testResult.permissions.thirdparties;
            const hasProjects = testResult.permissions && testResult.permissions.projects;
            const hasGed = testResult.permissions && testResult.permissions.ged;
            const hasGedPR = testResult.permissions && testResult.permissions.ged_pr;

            renderPermissions({
                connection: 'ok',
                users: hasUsers ? 'ok' : 'ko',
                tickets: hasTickets ? 'ok' : 'ko',
                thirdparties: hasThirdparties ? 'ok' : 'ko',
                projects: hasProjects ? 'ok' : 'ko',
                ged: hasGed ? 'ok' : 'ko',
                ged_pr: hasGedPR ? 'ok' : 'ko',
                date: new Date().toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
            }, normalizedUrl);
            
            // On met directement à jour le token si on l'a obtenu via un test de connexion
            const p = getActiveProfile();
            if(p && testResult.apiToken) {
                 p.doliApiToken = testResult.apiToken;
            }

        } else {
            testStatusDiv.style.color = "#e74c3c";
            testStatusDiv.textContent = '❌ Échec de la connexion.';
            renderPermissions({ connection: 'ko', users: 'pending', tickets: 'pending', thirdparties: 'pending', projects: 'pending', ged: 'pending', ged_pr: 'pending' }, normalizedUrl);
        }

        btnTest.disabled = false;
        btnTest.textContent = "🔌 Tester";
    });
});

// Sauvegarde les options
document.getElementById('save-btn').addEventListener('click', async () => {
    const urlInput = document.getElementById('doli-url');
    let url = urlInput.value;
    const login = document.getElementById('doli-login').value;
    const password = document.getElementById('doli-password').value;
    const statusDiv = document.getElementById('status');
    const btn = document.getElementById('save-btn');
    const apiIndicator = document.getElementById('api-status-indicator');

    if (!url || !login || !password) {
        statusDiv.style.color = "#e74c3c";
        statusDiv.textContent = 'Veuillez remplir tous les champs obligatoires (URL, Login, Mot de passe).';
        return;
    }

    // Normalise l'URL pour éviter les slashs finaux
    let normalizedUrl = url.trim();
    if (normalizedUrl.endsWith('/')) {
        normalizedUrl = normalizedUrl.slice(0, -1);
    }

    // Auto-complétion de /api/index.php si oublié
    if (!normalizedUrl.endsWith('/api/index.php')) {
        if (normalizedUrl.endsWith('/htdocs')) {
            normalizedUrl += '/api/index.php';
        } else if (!normalizedUrl.includes('/api/index.php')) {
            normalizedUrl += '/htdocs/api/index.php';
        }
        urlInput.value = normalizedUrl;
    }

    // Mise à jour de l'UI pour indiquer le chargement
    btn.disabled = true;
    btn.textContent = "Sauvegarde en cours...";
    statusDiv.textContent = "";

    const formatVal = document.querySelector('input[name="doli-format"]:checked').value;
    const defaultViewVal = document.querySelector('input[name="doli-default-view"]:checked').value;
    const autoAssignVal = document.getElementById('doli-auto-assign').checked;
    const oppOnlyVal = document.getElementById('doli-opp-only') ? document.getElementById('doli-opp-only').checked : true;
    const blurVal = document.getElementById('doli-blur').value;
    const recentCountVal = parseInt(document.getElementById('doli-recent-count').value, 10) || 10;
    const entityVal = document.getElementById('doli-entity').value.trim();
    
    // Champs tickets
    const ticketTypeVal = document.getElementById('doli-ticket-type').value.trim();
    const ticketSeverityVal = document.getElementById('doli-ticket-severity').value.trim();
    const ticketCategoryVal = document.getElementById('doli-ticket-category').value.trim();

    // On récupère le profil actif pour le mettre à jour
    const p = getActiveProfile();
    if (!p) return;

    // Sauvegarde en base des données
    p.doliUrl = normalizedUrl;
    p.doliLogin = login;
    if (password && password.trim() !== '') {
        p.doliApiToken = password;
    }
    p.doliAutoAssign = autoAssignVal;
    p.doliOppOnly = oppOnlyVal;
    p.doliEntity = entityVal;
    p.doliTicketType = ticketTypeVal;
    p.doliTicketSeverity = ticketSeverityVal;
    p.doliTicketCategory = ticketCategoryVal;

    chrome.storage.sync.set({ 
        doliProfiles: profiles,
        doliActiveProfileId: activeProfileId,
        'doliImageFormat': formatVal,
        'doliBlurIntensity': blurVal,
        'doliDefaultView': defaultViewVal,
        'doliRecentCount': recentCountVal
    }, () => {
        statusDiv.style.color = "#27ae60";
        statusDiv.textContent = '✅ Paramètres sauvegardés avec succès !';
        
        // Nettoyer le message après quelques secondes
        setTimeout(() => {
            statusDiv.textContent = '';
        }, 3000);

        btn.disabled = false;
        btn.textContent = "Enregistrer";
    });
});

// Affiche le tableau des droits
function renderPermissions(statusObj, baseUrl) {
    const dashboard = document.getElementById('permissions-dashboard');
    if (!dashboard) return;
    
    const st = statusObj || {};
    const baseDoli = baseUrl ? baseUrl.replace(/\/api\/index\.php$/, '') : '';

    const categories = [
        {
            name: "Utilisateurs & Groupes",
            rights: [
                { id: '251', title: "Lire les utilisateurs, les groupes et leurs permissions", key: "users" }
            ]
        },
        {
            name: "Tiers",
            rights: [
                { id: '121', title: "Consulter les tiers (sociétés) liés à l'utilisateur", key: "thirdparties" },
                { id: '262', title: "Étendre l'accès à tous les tiers / Lire les tiers", key: "thirdparties" }
            ]
        },
        {
            name: "Projets ou Opportunités",
            rights: [
                { id: '41', title: "Lire les projets et les tâches (partagés / contact)", key: "projects" },
                { id: '42', title: "Créer/modifier des projets (partagés / contact)", key: "projects" }
            ]
        },
        {
            name: "Tickets",
            rights: [
                { id: '331', title: "Lire et consulter les tickets", key: "tickets" }
            ]
        },
        {
            name: "GED",
            rights: [
                { id: '542', title: "Consulter les documents", key: "ged" },
                { id: 'PR #37499', title: "API Documents : Support pour les Tickets", key: "ged_pr" }
            ]
        },
        {
            name: "API / Web services",
            rights: [
                { id: 'API', title: "Connexion API REST", key: "connection" }
            ]
        }
    ];

    let html = '';
    
    categories.forEach(cat => {
        html += `<div class="perm-category"><h4 class="perm-category-title">${cat.name}</h4>`;
        cat.rights.forEach(right => {
            let status = st[right.key];
            let statusText = 'Non testé';
            let statusClass = 'pending';
            
            if (status === 'ok') { statusText = 'OK'; statusClass = 'ok'; }
            else if (status === 'ko') { statusText = 'KO'; statusClass = 'ko'; }
            else if (status === 'warning') { statusText = 'Test...'; statusClass = 'warning'; }

            let rightLink = "#";
            if (baseDoli && right.id === 'PR #37499') {
                rightLink = "https://github.com/Dolibarr/dolibarr/pull/37499";
            } else if (baseDoli && right.id !== 'API') {
                // Lien basé sur l'ID 58 spécifié, injection du right ID de manière dynamique.
                rightLink = `${baseDoli}/user/group/perms.php?id=58&rights=${right.id}`;
            } else if (baseDoli && right.id === 'API') {
                rightLink = `${baseDoli}/admin/modules.php?search_keyword=api`;
            }

            html += `
            <div class="perm-row">
                <span class="perm-id">${right.id}</span>
                <span class="perm-title">${right.title}</span>
                <span class="perm-link"><a href="${rightLink}" target="_blank" title="Voir ce droit sur Dolibarr">🔗 Voir</a></span>
                <span class="perm-status ${statusClass}">${statusText}</span>
            </div>`;
        });
        html += `</div>`;
    });
    
    if (st.date) {
        html += `<div style="padding: 8px 12px; font-size: 11px; color: #7f8c8d; text-align: right; background: #fff;">Dernier contrôle : ${st.date}</div>`;
    }

    dashboard.innerHTML = html;
    dashboard.classList.remove('hidden');
}

// Cache l'état OK/KO si l'utilisateur modifie l'URL
document.getElementById('doli-url').addEventListener('input', () => {
    document.getElementById('api-status-indicator').className = 'status-indicator';
});
