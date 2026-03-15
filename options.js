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
            return { success: false, error: "Identifiants invalides ou connexion refusée" };
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
        return { success: false, error: "Impossible de joindre l'API Dolibarr à cette adresse" };
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

document.addEventListener('DOMContentLoaded', () => {
    const urlInput = document.getElementById('doli-url');
    const loginInput = document.getElementById('doli-login');
    const passwordInput = document.getElementById('doli-password');
    const statusDashboard = document.getElementById('status-dashboard');
    const blurInput = document.getElementById('doli-blur');
    const blurValue = document.getElementById('doli-blur-value');
    const blurOverlay = document.getElementById('doli-blur-overlay');
    const autoAssignInput = document.getElementById('doli-auto-assign');
    const entityInput = document.getElementById('doli-entity'); // Added entity input
    const oppOnlyInput = document.getElementById('doli-opp-only');

    blurInput.addEventListener('input', () => {
        const val = blurInput.value;
        blurValue.textContent = val + 'px';
        blurOverlay.style.backdropFilter = `blur(${val}px)`;
        blurOverlay.style.webkitBackdropFilter = `blur(${val}px)`;
    });
    const recentCountInput = document.getElementById('doli-recent-count');

    chrome.storage.sync.get(['doliUrl', 'doliLogin', 'doliPassword', 'doliApiToken', 'doliBlurIntensity', 'doliImageFormat', 'doliAutoAssign', 'doliOppOnly', 'doliDefaultView', 'doliRecentCount', 'doliEntity', 'doliStatus'], (items) => {
        if (items.doliUrl) urlInput.value = items.doliUrl;
        if (items.doliLogin) loginInput.value = items.doliLogin;
        if (items.doliPassword) passwordInput.value = items.doliPassword;
        if (items.doliEntity) entityInput.value = items.doliEntity;
        if (items.doliAutoAssign !== undefined) autoAssignInput.checked = items.doliAutoAssign;
        if (items.doliOppOnly !== undefined && oppOnlyInput) oppOnlyInput.checked = items.doliOppOnly;
        if (items.doliRecentCount !== undefined) recentCountInput.value = items.doliRecentCount;

        if (items.doliDefaultView) {
            const radioView = document.querySelector(`input[name="doli-default-view"][value="${items.doliDefaultView}"]`);
            if (radioView) radioView.checked = true;
        }

        if (items.doliImageFormat) {
            const radio = document.querySelector(`input[name="doli-format"][value="${items.doliImageFormat}"]`);
            if (radio) radio.checked = true;
        }
        if (items.doliBlurIntensity) {
            blurInput.value = items.doliBlurIntensity;
            blurValue.textContent = items.doliBlurIntensity + 'px';
            blurOverlay.style.backdropFilter = `blur(${items.doliBlurIntensity}px)`;
            blurOverlay.style.webkitBackdropFilter = `blur(${items.doliBlurIntensity}px)`;
        }

        if (items.doliStatus) {
            renderPermissions(items.doliStatus, items.doliUrl);
        } else {
            renderPermissions(null, null);
        }
    });
});

// Sauvegarde les options
document.getElementById('save-btn').addEventListener('click', async () => {
    const urlInput = document.getElementById('doli-url');
    const url = urlInput.value;
    const login = document.getElementById('doli-login').value;
    const password = document.getElementById('doli-password').value;
    const statusDiv = document.getElementById('status');
    const btn = document.getElementById('save-btn');
    const apiIndicator = document.getElementById('api-status-indicator');

    const statusDashboard = document.getElementById('permissions-dashboard');

    if (!url || !login || !password) {
        statusDiv.style.color = "#e74c3c";
        statusDiv.textContent = 'Veuillez remplir tous les champs.';
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
    btn.textContent = "Test de la connexion...";
    statusDiv.textContent = "";
    statusDiv.style.color = "#333";

    // Réinitialise l'indicateur visuel textuel (legacy)
    apiIndicator.className = 'status-indicator';
    apiIndicator.textContent = '...';
    apiIndicator.style.display = 'inline-block';

    // Affiche le nouveau dashboard
    statusDashboard.classList.remove('hidden');
    const formatVal = document.querySelector('input[name="doli-format"]:checked').value;
    const defaultViewVal = document.querySelector('input[name="doli-default-view"]:checked').value;
    const autoAssignVal = document.getElementById('doli-auto-assign').checked;
    const oppOnlyVal = document.getElementById('doli-opp-only') ? document.getElementById('doli-opp-only').checked : true;
    const blurVal = document.getElementById('doli-blur').value; // Get blur value here
    const recentCountVal = parseInt(document.getElementById('doli-recent-count').value, 10) || 10;
    const entityVal = document.getElementById('doli-entity').value.trim();

    renderPermissions({ connection: 'warning', users: 'warning', tickets: 'warning', thirdparties: 'warning', projects: 'warning', ged: 'warning', ged_pr: 'warning' }, normalizedUrl);

    // Test de connexion
    const testResult = await testDolibarrConnection(normalizedUrl, login, password, entityVal);

    if (testResult.success) {
        const hasUsers = testResult.permissions && testResult.permissions.users;
        const hasTickets = testResult.permissions && testResult.permissions.tickets;
        const hasThirdparties = testResult.permissions && testResult.permissions.thirdparties;
        const hasProjects = testResult.permissions && testResult.permissions.projects;
        const hasGed = testResult.permissions && testResult.permissions.ged;
        const hasGedPR = testResult.permissions && testResult.permissions.ged_pr;

        chrome.storage.sync.set({
            doliUrl: normalizedUrl,
            doliLogin: login,
            doliPassword: password,
            doliApiToken: testResult.apiToken || password,
            doliBlurIntensity: blurVal,
            doliImageFormat: formatVal,
            doliAutoAssign: autoAssignVal,
            doliOppOnly: oppOnlyVal,
            doliDefaultView: defaultViewVal,
            doliRecentCount: recentCountVal,
            doliEntity: entityVal,
            doliStatus: {
                date: new Date().toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }),
                connection: 'ok',
                users: hasUsers ? 'ok' : 'ko',
                tickets: hasTickets ? 'ok' : 'ko',
                thirdparties: hasThirdparties ? 'ok' : 'ko',
                ged: hasGed ? 'ok' : 'ko',
                usersText: hasUsers ? 'Droits Utilisateurs OK' : 'Utilisateur (251) KO',
                ticketsText: hasTickets ? 'Droits Tickets OK' : 'Tickets KO',
                thirdpartiesText: hasThirdparties ? 'Droits Tiers OK' : 'Tiers (262) KO',
                gedText: hasGed ? 'Droits GED OK' : 'GED (542) KO',
                usersTooltip: hasUsers ? '' : DOLI_RIGHTS_DESC['251'],
                ticketsTooltip: hasTickets ? '' : DOLI_RIGHTS_DESC['tickets'],
                thirdpartiesTooltip: hasThirdparties ? '' : DOLI_RIGHTS_DESC['262'],
                gedTooltip: hasGed ? '' : DOLI_RIGHTS_DESC['542']
            }
        }, () => {
            let successMessage = 'Connexion réussie & Paramètres sauvegardés !';

            // Ajout du statut des droits
            let hasWarning = false;

            if (!testResult.permissions.users) {
                successMessage += `<br><small style="color: #e67e22;">⚠️ Assignation auto impossible : ${DOLI_RIGHTS_DESC['251']}</small>`;
                hasWarning = true;
            }
            if (!testResult.permissions.tickets) {
                successMessage += `<br><small style="color: #e67e22;">⚠️ L\'encart "Derniers Tickets" sera vide : ${DOLI_RIGHTS_DESC['tickets']}</small>`;
                hasWarning = true;
            }
            if (!testResult.permissions.thirdparties) {
                successMessage += `<br><small style="color: #e67e22;">⚠️ La création d\'opportunités posera problème sans accès aux Clients : ${DOLI_RIGHTS_DESC['262']}</small>`;
                hasWarning = true;
            }
            if (!testResult.permissions.projects) {
                successMessage += `<br><small style="color: #e67e22;">⚠️ La création d\'opportunités sera bloquée sans accès aux Projets : Droits 41 et 42</small>`;
                hasWarning = true;
            }
            if (!testResult.permissions.ged_pr) {
                successMessage += '<br><small style="color: #e67e22;">⚠️ L\'envoi d\'images échouera : Le correctif <a href="https://github.com/Dolibarr/dolibarr/pull/37499" target="_blank" style="color: inherit; text-decoration: underline;">PR #37499</a> manque dans l\'API de votre serveur.</small>';
                hasWarning = true;
            }
            if (!testResult.permissions.ged) {
                successMessage += '<br><small style="color: #e67e22;">⚠️ L\'envoi d\'images/fichiers échouera (Manque Droit API Documents / GED).</small>';
                hasWarning = true;
            }

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

            // Ajout du nom de l'entité si connue
            if (testResult.entityName && testResult.entityName !== "Inconnue") {
                successMessage += `<br><span style="color: #7f8c8d; font-size: 11px;">🏢 Entité connectée : <strong>${testResult.entityName}</strong></span>`;
            }

            statusDiv.style.color = hasWarning ? "#e67e22" : "#27ae60";
            statusDiv.innerHTML = successMessage;

            // Met à jour l'indicateur visuel URL OK
            apiIndicator.textContent = 'OK';
            apiIndicator.classList.add('status-ok');

            setTimeout(() => {
                statusDiv.innerHTML = '';
            }, 6000);
        });
    } else {
        statusDiv.style.color = "#e74c3c";
        statusDiv.innerHTML = `⚠️ <strong>Erreur :</strong> ${testResult.error}<br><small style="color: #c0392b;">Assurez-vous que le module <strong>API REST</strong> est activé et que votre utilisateur dispose de la permission pour l'utiliser.</small>`;

        renderPermissions({ connection: 'ko', users: 'pending', tickets: 'pending', thirdparties: 'pending', projects: 'pending', ged: 'pending', ged_pr: 'pending' }, normalizedUrl);

        // Met à jour l'indicateur visuel URL KO
        apiIndicator.textContent = 'KO';
        apiIndicator.classList.add('status-ko');
    }

    // Réinitialisation de l'UI
    btn.disabled = false;
    btn.textContent = "Enregistrer";
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
