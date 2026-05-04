
import { MESSAGE_TYPES } from '../../src/utils/constants.js';

// Remplacement global pour intercepter les fetch et les envoyer au SW (Règle 12)
async function fetchDoli(url, options = {}) {
    return new Promise((resolve, reject) => {
        let method = options.method || 'GET';
        let body = options.body ? JSON.parse(options.body) : null;
        let doliUrl = '', endpoint = '', apiKey = '';

        try {
            const urlObj = new URL(url);
            doliUrl = urlObj.origin + (urlObj.pathname.includes('/api/index.php') ? urlObj.pathname.split('/api/index.php')[0] : '');
            endpoint = url.replace(doliUrl + '/api/index.php', '');
            if(!endpoint.startsWith('/')) {
                endpoint = url.replace(doliUrl, '');
            }
        } catch(e) {}

        apiKey = options.headers?.DOLAPIKEY || options.headers?.['DOLAPIKEY'];

        chrome.runtime.sendMessage({
            type: MESSAGE_TYPES.API_CALL,
            payload: { method, doliUrl, apiKey, endpoint, body }
        }, response => {
            if (chrome.runtime.lastError) {
                return reject(new Error(chrome.runtime.lastError.message));
            }
            if (response && response.error) {
                return resolve({
                    ok: false,
                    status: 500,
                    statusText: response.error,
                    json: async () => { throw new Error(response.error); },
                    text: async () => response.error
                });
            }
            resolve({
                ok: true,
                status: 200,
                json: async () => response.data,
                text: async () => typeof response.data === 'string' ? response.data : JSON.stringify(response.data),
                blob: async () => {
                    if(response.data) { // si base64 passé dans data
                        const bstr = atob(response.data);
                        const n = bstr.length;
                        const u8arr = new Uint8Array(n);
                        for(let i=0; i<n; i++) u8arr[i] = bstr.charCodeAt(i);
                        return new Blob([u8arr], {type: response.mime || 'application/octet-stream'});
                    }
                    return null;
                }
            });
        });
    });
}

class CustomSelect {
    constructor(selectElement) {
        this.selectElement = selectElement;
        this.container = selectElement.parentElement;
        this.wrapper = null;
        this.trigger = null;
        this.optionsContainer = null;
        this.searchInput = null;
        this.optionsList = null;

        this.init();
    }

    init() {
        if (!this.container.classList.contains('searchable-select-container')) return;

        // Remove existing wrapper if re-initializing
        const existingWrapper = this.container.querySelector('.custom-select-wrapper');
        if (existingWrapper) {
            this.container.removeChild(existingWrapper);
        }

        this.selectElement.classList.add('hidden'); // Ensure original select is hidden

        this.wrapper = document.createElement('div');
        this.wrapper.className = 'custom-select-wrapper';

        this.trigger = document.createElement('div');
        this.trigger.className = 'custom-select-trigger';

        const selectedOption = this.selectElement.options[this.selectElement.selectedIndex] || this.selectElement.options[0];
        let triggerText = selectedOption ? selectedOption.textContent : '-- Sélectionnez --';

        this.trigger.innerHTML = `<span>${triggerText}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>`;

        this.optionsContainer = document.createElement('div');
        this.optionsContainer.className = 'custom-options-container';

        const searchBox = document.createElement('div');
        searchBox.className = 'custom-search-box';
        this.searchInput = document.createElement('input');
        this.searchInput.type = 'text';
        this.searchInput.placeholder = chrome.i18n.getMessage('popup_jsph_134');
        searchBox.appendChild(this.searchInput);

        this.optionsList = document.createElement('div');
        this.optionsList.className = 'custom-options';

        this.optionsContainer.appendChild(searchBox);
        this.optionsContainer.appendChild(this.optionsList);

        this.wrapper.appendChild(this.trigger);
        this.wrapper.appendChild(this.optionsContainer);
        this.container.appendChild(this.wrapper);

        this.renderOptions();
        this.bindEvents();
    }

    renderOptions(filter = '') {
        this.optionsList.innerHTML = '';
        const lowercaseFilter = filter.toLowerCase();
        let matchCount = 0;

        Array.from(this.selectElement.options).forEach((option, index) => {
            const text = option.textContent;
            const searchContext = (text + ' ' + (option.dataset.search || '')).toLowerCase();
            if (searchContext.includes(lowercaseFilter)) {
                const customOption = document.createElement('div');
                customOption.className = 'custom-option';
                if (option.disabled) customOption.classList.add('disabled');
                if (option.selected) customOption.classList.add('selected');
                customOption.textContent = text;
                customOption.dataset.value = option.value;
                customOption.dataset.index = index;

                customOption.addEventListener('click', (e) => {
                    if (option.disabled) return;
                    e.stopPropagation();
                    this.selectOption(option.value, customOption);
                });

                this.optionsList.appendChild(customOption);
                matchCount++;
            }
        });

        if (matchCount === 0) {
            const noMatch = document.createElement('div');
            noMatch.className = 'custom-option disabled';
            noMatch.textContent = chrome.i18n.getMessage('popup_js_110');
            this.optionsList.appendChild(noMatch);
        }
    }

    selectOption(value, optionElement) {
        this.selectElement.value = value;
        // Trigger generic change event on original select to notify listeners
        this.selectElement.dispatchEvent(new Event('change'));

        this.trigger.querySelector('span').textContent = optionElement.textContent;

        // Update selected class visually
        const allOptions = this.optionsList.querySelectorAll('.custom-option');
        allOptions.forEach(opt => opt.classList.remove('selected'));
        optionElement.classList.add('selected');

        this.close();
    }

    bindEvents() {
        this.trigger.addEventListener('click', () => {
            this.wrapper.classList.toggle('open');
            this.trigger.classList.toggle('open');
            if (this.wrapper.classList.contains('open')) {
                this.searchInput.value = '';
                this.renderOptions(); // Render all on open
                setTimeout(() => this.searchInput.focus(), 100);
            }
        });

        this.searchInput.addEventListener('input', (e) => {
            this.renderOptions(e.target.value);
        });

        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.wrapper.contains(e.target)) {
                this.close();
            }
        });
    }

    close() {
        this.wrapper.classList.remove('open');
        this.trigger.classList.remove('open');
    }

    // Call this if the underlying <select> is modified externally
    update() {
        this.init();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    try {
        const setupWarning = document.getElementById('setup-warning');
        const ticketForm = document.getElementById('ticket-form');
        const btnOpenOptions = document.getElementById('btn-open-options');
        const statusMessage = document.getElementById('status-message');
        const btnSubmit = document.getElementById('btn-submit');
        const assigneeSelect = document.getElementById('ticket-assignee');

        // Nouveaux éléments UI (Onglets & Vues)
        const tabTicket = document.getElementById('tab-ticket');
        const tabOpportunite = document.getElementById('tab-opportunite');
        const viewTicket = document.getElementById('view-ticket');
        const viewOpportunity = document.getElementById('view-opportunity');
        const viewTitle = document.getElementById('view-title');
        const recentTicketsContainer = document.getElementById('recent-tickets-container');
        const recentTicketsList = document.getElementById('recent-tickets-list');

        const oppForm = document.getElementById('opp-form');
        const btnSubmitOpp = document.getElementById('opp-btn-submit');
        
        // --- Handlers migrés pour conformité CSP ---
        const tabOppList = document.getElementById('tab-opp-list');
        const viewOppList = document.getElementById('view-opp-list');
        
        const oppTelInput = document.getElementById('opp-tel');
        if (oppTelInput) {
            oppTelInput.addEventListener('input', function() {
                this.value = this.value.replace(/[^0-9\s()+\-.]/g, '');
            });
        }
        // -------------------------------------------
        const oppAssigneeSelect = document.getElementById('opp-assignee');
        const oppStatusMessage = document.getElementById('opp-status-message');
        const recentOppContainer = document.getElementById('recent-opp-container');
        const recentOppList = document.getElementById('recent-opp-list');

        // Logique de changement d'onglet
        function switchTab(view) {
            viewTitle.classList.add('hidden'); // On masque le h2 "Nouveau Ticket/Opp" dans tous les cas
            const ticketActions = document.getElementById('ticket-top-actions');
            if (ticketActions) ticketActions.style.display = 'flex'; // On affiche le bloc Tiers/Contact/Projet dans tous les cas

            const projectContainer = document.getElementById('ticket-project-container');

            // Reset UI states
            tabTicket.classList.remove('active');
            tabOpportunite.classList.remove('active');
            if (tabOppList) tabOppList.classList.remove('active');
            
            viewTicket.classList.add('hidden');
            viewOpportunity.classList.add('hidden');
            if (viewOppList) viewOppList.classList.add('hidden');

            if (view === 'opportunite') {
                tabOpportunite.classList.add('active');
                viewOpportunity.classList.remove('hidden');
                if (projectContainer) projectContainer.style.display = 'none'; // Pas de projet dans une opportunité
                const mainHeader = document.getElementById('main-header-container');
                if(mainHeader) mainHeader.style.display = '';
            } else if (view === 'opp-list') {
                if (tabOppList) tabOppList.classList.add('active');
                if (viewOppList) viewOppList.classList.remove('hidden');
                if (ticketActions) ticketActions.style.display = 'none'; // Masquer top-actions
                const mainHeader = document.getElementById('main-header-container');
                if(mainHeader) mainHeader.style.display = 'none';
            } else {
                tabTicket.classList.add('active');
                viewTicket.classList.remove('hidden');
                if (projectContainer) projectContainer.style.display = ''; // On réaffiche pour les tickets
                const mainHeader = document.getElementById('main-header-container');
                if(mainHeader) mainHeader.style.display = '';
            }
        }

        tabTicket.addEventListener('click', () => switchTab('ticket'));
        tabOpportunite.addEventListener('click', () => switchTab('opportunite'));
        if (tabOppList) {
            tabOppList.addEventListener('click', () => switchTab('opp-list'));
        }

        // Ouvre la page d'options
        btnOpenOptions.addEventListener('click', () => {
            chrome.runtime.openOptionsPage();
        });

        // Fonction pour charger les utilisateurs depuis Dolibarr
        async function loadUsers(apiUrl, token, userLogin, autoAssign, entity) {
            try {
                const headers = {
                    'DOLAPIKEY': token,
                    'Accept': 'application/json'
                };
                if (entity && String(entity).trim() !== '') {
                    headers['DOLAPIENTITY'] = String(entity).trim();
                }

                // L'API GET /users permet de lister les utilisateurs
                // On peut ajouter ?limit=100&statut=1 pour n'avoir que les actifs
                // NOTE: On retire le '&entity=' de l'URL car cela force Dolibarr à filtrer *strictement* sur l'entité de création
                // ignorant ainsi les partages multi-company. On s'en remet à l'entête DOLAPIENTITY et on augmente la limite.
                const response = await fetchDoli(`${apiUrl}/users?limit=500&statut=1`, {
                    method: 'GET',
                    headers: headers
                });

                if (response.ok) {
                    const users = await response.json();

                    // Nettoyer le select avant de le remplir
                    assigneeSelect.innerHTML = '<option value="">-- Non assigné --</option>';

                    // Remplir avec les utilisateurs
                    if (Array.isArray(users)) {
                        const activeUsers = users.filter(u => {
                            // On s'assure qu'il est actif (u.statut DESC)
                            const isActive = (String(u.statut) === "1" || String(u.status) === "1");
                            
                            // L'utilisateur doit être marqué comme employé (u.employee = 1 ou true)
                            const isEmployee = (u.employee == 1 || u.employee === true || String(u.employee) === "1");

                            return isActive && isEmployee;
                        });
                        
                        // Tri alphabétique (firstname ASC, lastname ASC) selon la requête SQL
                        activeUsers.sort((a, b) => {
                            const nameA = ((a.firstname || '') + ' ' + (a.lastname || '')).trim().toLowerCase();
                            const nameB = ((b.firstname || '') + ' ' + (b.lastname || '')).trim().toLowerCase();
                            return nameA.localeCompare(nameB);
                        });

                        activeUsers.forEach(user => {
                            const option = document.createElement('option');
                            option.value = user.id;
                            // On privilégie le nom complet (firstname lastname) ou le login
                            const displayName = [user.firstname, user.lastname].filter(Boolean).join(' ') || user.login;
                            option.textContent = displayName;

                            // Auto-assignation si l'option est cochée et que le login correspond
                            if (autoAssign && userLogin && user.login && user.login.toLowerCase() === userLogin.toLowerCase()) {
                                option.selected = true;
                            }

                            assigneeSelect.appendChild(option);
                        });
                        
                        if (!window.ticketAssigneeSelect) window.ticketAssigneeSelect = new CustomSelect(assigneeSelect);
                        else window.ticketAssigneeSelect.update();
                        
                        return activeUsers;
                    }
                    if (!window.ticketAssigneeSelect) window.ticketAssigneeSelect = new CustomSelect(assigneeSelect);
                    else window.ticketAssigneeSelect.update();
                    return [];

                } else {
                    assigneeSelect.innerHTML = '<option value="">Erreur chargement utilisateurs</option>';
                    if (window.ticketAssigneeSelect) window.ticketAssigneeSelect.update();
                    return [];
                }
            } catch (error) {
                console.error("Erreur fetch users:", error);
                assigneeSelect.innerHTML = '<option value="">Impossible de charger les utilisateurs</option>';
                if (window.ticketAssigneeSelect) window.ticketAssigneeSelect.update();
                return [];
            }
        }

        // Fonction pour charger les Tiers
        async function loadThirdparties(apiUrl, token, entity) {
            const tiersSelect = document.getElementById('ticket-tiers');
            let fetchedTiers = [];
            try {
                // mode=1 pour ne lister que les clients/prospects (souvent suffisant pour devis/tickets)
                const response = await fetchDoli(`${apiUrl}/thirdparties?limit=50000&sortfield=t.nom&sortorder=ASC&mode=1`, {
                    headers: {
                        'DOLAPIKEY': token,
                        'Accept': 'application/json',
                        ...(entity ? { 'DOLAPIENTITY': String(entity).trim() } : {})
                    }
                });
                
                tiersSelect.innerHTML = '<option value="">Client / Prospect</option>';
                
                if (response.ok) {
                    const tiers = await response.json();
                    if (Array.isArray(tiers)) {
                        fetchedTiers = tiers;
                        tiers.forEach(t => {
                            const option = document.createElement('option');
                            option.value = t.id;
                            let displayName = t.name || t.nom || `Tiers #${t.id}`;
                            if (t.name_alias) displayName += ` - ${t.name_alias}`;
                            option.textContent = displayName;
                            
                            // On stocke aussi l'alias et d'autres infos dans un dataset pour la recherche si on modifie CustomSelect un jour
                            option.dataset.search = (t.name_alias || '').toLowerCase();
                            tiersSelect.appendChild(option);
                        });
                    }
                }
            } catch (error) {
                console.error("Erreur fetch tiers:", error);
                tiersSelect.innerHTML = '<option value="">Erreur chargement</option>';
            }
            
            if (!window.ticketTiersSelect) {
                window.ticketTiersSelect = new CustomSelect(tiersSelect);
            } else {
                window.ticketTiersSelect.update();
            }
            
            // Initialisation Contact Select (vide par défaut)
            const contactSelect = document.getElementById('ticket-contact');
            if (!window.ticketContactSelect) {
                window.ticketContactSelect = new CustomSelect(contactSelect);
            }
            
            // Initialisation Project Select (vide par défaut)
            const projectSelect = document.getElementById('ticket-project');
            if (!window.ticketProjectSelect) {
                window.ticketProjectSelect = new CustomSelect(projectSelect);
            }
            return fetchedTiers;
        }

        // Fonction pour charger les Contacts d'un Tiers
        async function loadContacts(apiUrl, token, entity, socid) {
            const contactSelect = document.getElementById('ticket-contact');
            const contactContainer = document.getElementById('ticket-contact-container');
            
            if (!socid) {
                contactSelect.innerHTML = '<option value="">Contact</option>';
                if (window.ticketContactSelect) window.ticketContactSelect.update();
                contactContainer.classList.add('hidden'); // Optionnel - Hide if no tiers
                return;
            }
            
            contactContainer.classList.remove('hidden');
            contactSelect.innerHTML = '<option value="">Chargement...</option>';
            if (window.ticketContactSelect) window.ticketContactSelect.update();

            try {
                const response = await fetchDoli(`${apiUrl}/contacts?limit=500&sortfield=t.lastname&sortorder=ASC&thirdparty_ids=${socid}`, {
                    headers: {
                        'DOLAPIKEY': token,
                        'Accept': 'application/json',
                        ...(entity ? { 'DOLAPIENTITY': String(entity).trim() } : {})
                    }
                });
                
                contactSelect.innerHTML = '<option value="">Contact</option>';
                
                if (response.ok) {
                    const contacts = await response.json();
                    if (Array.isArray(contacts) && contacts.length > 0) {
                        contacts.forEach(c => {
                            const option = document.createElement('option');
                            option.value = c.id;
                            option.textContent = [c.firstname, c.lastname].filter(Boolean).join(' ') || `Contact #${c.id}`;
                            contactSelect.appendChild(option);
                        });
                    } else {
                        contactSelect.innerHTML = '<option value="">Aucun contact lié</option>';
                    }
                } else if (response.status === 404) {
                    contactSelect.innerHTML = '<option value="">Aucun contact lié</option>';
                } else {
                    contactSelect.innerHTML = '<option value="">Erreur chargement</option>';
                }
            } catch (error) {
                console.error("Erreur fetch contacts:", error);
                contactSelect.innerHTML = '<option value="">Erreur chargement</option>';
            }
            if (window.ticketContactSelect) window.ticketContactSelect.update();
        }

        // Fonction pour charger les Projets d'un Tiers
        async function loadProjects(apiUrl, token, entity, socid) {
            const projectSelect = document.getElementById('ticket-project');
            const projectContainer = document.getElementById('ticket-project-container');
            
            if (!socid) {
                projectSelect.innerHTML = '<option value="">Projet</option>';
                if (window.ticketProjectSelect) window.ticketProjectSelect.update();
                projectContainer.classList.add('hidden'); // Optionnel - Hide if no tiers
                return;
            }
            
            projectContainer.classList.remove('hidden');
            projectSelect.innerHTML = '<option value="">Chargement...</option>';
            if (window.ticketProjectSelect) window.ticketProjectSelect.update();

            try {
                // On utilise thirdparty_ids ou un filtre SQL si nécessaire. limit=500 pour avoir tout
                const response = await fetchDoli(`${apiUrl}/projects?limit=500&sortfield=t.ref&sortorder=DESC&thirdparty_ids=${socid}`, {
                    headers: {
                        'DOLAPIKEY': token,
                        'Accept': 'application/json',
                        ...(entity ? { 'DOLAPIENTITY': String(entity).trim() } : {})
                    }
                });
                
                projectSelect.innerHTML = '<option value="">Projet</option>';
                
                if (response.ok) {
                    const projects = await response.json();
                    if (Array.isArray(projects) && projects.length > 0) {
                        projects.forEach(p => {
                            const option = document.createElement('option');
                            option.value = p.id;
                            option.textContent = p.ref + (p.title ? ` - ${p.title}` : '');
                            projectSelect.appendChild(option);
                        });
                    } else {
                        projectSelect.innerHTML = '<option value="">Aucun projet lié</option>';
                    }
                } else if (response.status === 404) {
                    projectSelect.innerHTML = '<option value="">Aucun projet lié</option>';
                } else {
                    projectSelect.innerHTML = '<option value="">Erreur chargement</option>';
                }
            } catch (error) {
                console.error("Erreur fetch projets:", error);
                projectSelect.innerHTML = '<option value="">Erreur chargement</option>';
            }
            if (window.ticketProjectSelect) window.ticketProjectSelect.update();
        }

        // Fonction pour charger les derniers tickets
        async function loadRecentTickets(apiUrl, token, limit = 10, entity, usersPromise, thirdpartiesPromise) {
            recentTicketsContainer.classList.remove('hidden');
            recentTicketsList.innerHTML = `
                <div class="loader-container">
                    <div class="loader-spinner"></div>
                    <div>${chrome.i18n.getMessage("popup_32") || "Chargement des tickets..."}</div>
                </div>
            `;

            let usersList = [];
            if (usersPromise) {
                try { usersList = await usersPromise || []; } catch(e) { console.error("Erreur attente users dans tickets", e); }
            }
            
            let thirdpartiesList = [];
            if (thirdpartiesPromise) {
                try { thirdpartiesList = await thirdpartiesPromise || []; } catch(e) { console.error("Erreur attente tiers dans tickets", e); }
            }

            try {
                const doliBaseUrl = apiUrl.replace(/\/api\/index\.php\/?$/, '');

                const headers = {
                    'DOLAPIKEY': token,
                    'Accept': 'application/json'
                };
                if (entity && String(entity).trim() !== '') {
                    headers['DOLAPIENTITY'] = String(entity).trim();
                }

                // On tente de récupérer les tickets les plus récents via l'API (sortfield)
                let response = await fetchDoli(`${apiUrl}/tickets?sortfield=t.rowid&sortorder=DESC&limit=${limit}`, {
                    method: 'GET',
                    headers: headers
                });

                // Fallback de sécurité si l'API Dolibarr (versions anciennes) refuse le tri
                if (!response.ok && (response.status === 400 || response.status === 500)) {
                    response = await fetchDoli(`${apiUrl}/tickets?limit=${limit}`, {
                        method: 'GET',
                        headers: headers
                    });
                }

                if (response.ok) {
                    const textData = await response.text();
                    const tickets = textData.trim() ? JSON.parse(textData) : [];

                    let isArr = Array.isArray(tickets);

                    if (isArr && tickets.length > 0) {
                        recentTicketsList.innerHTML = ''; // Nettoyer
                        const sortedTickets = tickets.sort((a, b) => b.datec - a.datec).slice(0, limit);

                        sortedTickets.forEach(ticket => {
                            // 2. Initiales
                            let initials = "";
                            
                            // Enrichissement via la liste des utilisateurs mise en cache si l'API native ne remonte que l'ID (très fréquent sur REST)
                            if (ticket.fk_user_assign && usersList && usersList.length > 0) {
                                const matchedUser = usersList.find(u => String(u.id) === String(ticket.fk_user_assign));
                                if (matchedUser) {
                                    if (!ticket.user_assign_firstname) ticket.user_assign_firstname = matchedUser.firstname;
                                    if (!ticket.user_assign_lastname) ticket.user_assign_lastname = matchedUser.lastname;
                                    if (!ticket.user_assign_photo) ticket.user_assign_photo = matchedUser.photo;
                                }
                            }

                            if (ticket.user_assign_firstname && ticket.user_assign_lastname) {
                                initials = ticket.user_assign_firstname.charAt(0).toUpperCase() + ticket.user_assign_lastname.charAt(0).toUpperCase();
                            } else if (ticket.user_assign_fullname) {
                                const parts = String(ticket.user_assign_fullname).split(' ');
                                if (parts.length > 1) {
                                    initials = parts[0].charAt(0).toUpperCase() + parts[1].charAt(0).toUpperCase();
                                } else {
                                    initials = parts[0].substring(0, 2).toUpperCase();
                                }
                            } else if (ticket.user_read && ticket.user_read.fullname) {
                                // Fallback à l'utilisateur qui a lu si dispo 
                                const parts = String(ticket.user_read.fullname).split(' ');
                                initials = parts.length > 1 ? parts[0].charAt(0).toUpperCase() + parts[1].charAt(0).toUpperCase() : parts[0].substring(0, 2).toUpperCase();
                            } else if (ticket.user_create && ticket.user_create.login) {
                                initials = ticket.user_create.login.substring(0, 2).toUpperCase();
                            }

                            if (!initials) initials = "?";

                            // Troncature du sujet (agrandie à 50 caractères)
                            let subject = ticket.subject || "Sans titre";
                            if (subject.length > 50) subject = subject.substring(0, 50) + '...';

                            // Détermination de la couleur de la puce d'état et de son libellé
                            let statusColor = "#95a5a6"; // Gris par défaut (Inconnu)
                            const stat = String(ticket.status || ticket.fk_statut || ticket.statut || "").toLowerCase();
                            
                            let statusLabelText = stat;
                            const ticketStatusMap = {
                                "0": "Non lu",
                                "1": "Lu",
                                "2": "Assigné",
                                "3": "En cours",
                                "4": "En attente",
                                "5": "En attente retour",
                                "6": "En pause",
                                "7": "En pause",
                                "8": "Fermé (Résolu)",
                                "9": "Abandonné / Annulé"
                            };
                            if (ticketStatusMap[stat]) statusLabelText = ticketStatusMap[stat];
                            if (ticket.status_label) statusLabelText = ticket.status_label;
                            else if (ticket.statut_label) statusLabelText = ticket.statut_label;

                            if (stat === "0") {
                                statusColor = "#e74c3c"; // Rouge (Brouillon/Non lu)
                            } else if (stat === "1") {
                                statusColor = "#3498db"; // Bleu (À valider/Nouveau)
                            } else if (stat === "2" || stat === "3" || stat === "4" || stat === "5" || stat === "6" || stat === "7") {
                                statusColor = "#f39c12"; // Orange (En cours / Attente / Pause)
                            } else if (stat === "8") {
                                statusColor = "#27ae60"; // Vert (Résolu/Fermé)
                            } else if (stat === "9") {
                                statusColor = "#7f8c8d"; // Gris foncé (Annulé)
                            }

                            const ticketRef = ticket.ref || ticket.track_id || `Ticket #${ticket.id}`;
                            
                            // Résolution du Tiers manquant via le dictionnaire global
                            let companyName = ticket.thirdparty_name || ticket.soc_name;
                            if (!companyName && ticket.fk_soc && thirdpartiesList && thirdpartiesList.length > 0) {
                                const matchedTiers = thirdpartiesList.find(t => String(t.id) === String(ticket.fk_soc));
                                if (matchedTiers) companyName = matchedTiers.name || matchedTiers.nom;
                            }
                            if (!companyName && ticket.fk_soc) companyName = "Tiers #" + ticket.fk_soc;

                            // Troncature du nom du tiers pour l'alignement UI
                            if (companyName && companyName.length > 20) {
                                companyName = companyName.substring(0, 20) + '...';
                            }

                            const severity = ticket.severity_label || ticket.severity_code || "Normal";
                            
                            let dateFormatted = "";
                            let elapsedTimeStr = "";
                            if (ticket.datec) {
                                const d = new Date(ticket.datec * 1000);
                                const DD = String(d.getDate()).padStart(2, '0');
                                const MM = String(d.getMonth() + 1).padStart(2, '0');
                                const YYYY = d.getFullYear();
                                dateFormatted = `${DD}/${MM}/${YYYY}`;
                                
                                // Calcul du temps écoulé
                                const diffMs = Date.now() - d.getTime();
                                if (diffMs > 0) {
                                    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                                    const diffHrs = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                                    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                                    let tps = [];
                                    if (diffDays > 0) tps.push(`${diffDays} j`);
                                    tps.push(`${String(diffHrs).padStart(2,'0')}:${String(diffMins).padStart(2,'0')}`);
                                    elapsedTimeStr = `Tps: ${tps.join(' ')}`;
                                }
                            } else if (ticket.date_creation) {
                                const d = new Date(ticket.date_creation * 1000);
                                if (!isNaN(d)) dateFormatted = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth()+1).padStart(2, '0')}/${d.getFullYear()}`;
                            }

                            const progressPct = ticket.progress || ticket.progression || "0";

                            // ============================================
                            // Construction sécurisée du DOM (Anti-XSS, sans inline-JS, avec i18n)
                            // ============================================
                            const ticketEl = document.createElement('div');
                            ticketEl.className = 'recent-ticket-item';
                            ticketEl.style.cssText = "display: block; padding: 10px; border: 1px solid #e0e0e0; border-radius: 6px; margin-bottom: 8px; text-decoration: none;";

                            // --- Ligne 1 ---
                            const row1 = document.createElement('div');
                            row1.style.cssText = "display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;";

                            const row1Left = document.createElement('div');
                            row1Left.style.cssText = "display: flex; align-items: center; gap: 6px; flex-wrap: wrap; font-size: 13px; font-weight: 500; color: #333;";

                            const refLink = document.createElement('a');
                            refLink.href = `${doliBaseUrl}/ticket/card.php?id=${ticket.id}`;
                            refLink.target = "_blank";
                            refLink.title = chrome.i18n.getMessage('btn_open_ticket') || "Ouvrir le ticket";
                            refLink.style.cssText = "color: #2c3e50; text-decoration: none;";
                            refLink.textContent = ticketRef; // textContent sécurisé
                            row1Left.appendChild(refLink);

                            if (companyName) {
                                const dot1 = document.createElement('span');
                                dot1.style.color = "#ccc";
                                dot1.textContent = "•";
                                row1Left.appendChild(dot1);
                                
                                const compEl = document.createElement('span');
                                compEl.style.cssText = "display: flex; align-items: center; gap: 4px; color: #2c3e50;";
                                compEl.title = chrome.i18n.getMessage('label_thirdparty') || "Tiers";
                                compEl.innerHTML = `<i class="fas fa-building" style="color: #6a7491;"></i> `; // statique sûr
                                compEl.appendChild(document.createTextNode(companyName)); // texte dynamique sûr
                                row1Left.appendChild(compEl);
                            }

                            if (severity) {
                                const dot2 = document.createElement('span');
                                dot2.style.color = "#ccc";
                                dot2.textContent = "•";
                                row1Left.appendChild(dot2);

                                const sevEl = document.createElement('span');
                                sevEl.style.cssText = "display: flex; align-items: center; gap: 4px; color: #000;";
                                sevEl.title = chrome.i18n.getMessage('label_severity') || "Sévérité";
                                sevEl.innerHTML = `<i class="fas fa-thermometer-half" style="color: #34495e;"></i> `; // statique sûr
                                sevEl.appendChild(document.createTextNode(severity)); // texte dynamique sûr
                                row1Left.appendChild(sevEl);
                            }
                            
                            row1.appendChild(row1Left);

                            // --- Avatar & Statut ---
                            const row1Right = document.createElement('div');
                            row1Right.style.cssText = "display: flex; align-items: center; gap: 6px; flex-shrink: 0; padding-left: 10px;";

                            if (ticket.user_assign_photo && ticket.user_assign_photo.trim() !== '') {
                                const imgPhoto = document.createElement('img');
                                imgPhoto.src = `${doliBaseUrl}/document.php?modulepart=user&file=${encodeURIComponent(ticket.user_assign_photo)}`;
                                imgPhoto.style.cssText = "width: 24px; height: 24px; border-radius: 50%; object-fit: cover;";
                                imgPhoto.title = (chrome.i18n.getMessage('label_assigned_to') || "Assigné à:") + " " + initials;
                                // Remplacement d'erreur via Listener (Manifest V3 CSP compliance au lieu de onerror inline)
                                imgPhoto.addEventListener('error', () => {
                                    const fallb = document.createElement('div');
                                    fallb.style.cssText = "width: 24px; height: 24px; border-radius: 50%; background: #e0e0e0; color: #555; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; overflow: hidden;";
                                    fallb.title = imgPhoto.title;
                                    fallb.textContent = initials;
                                    imgPhoto.replaceWith(fallb);
                                });
                                row1Right.appendChild(imgPhoto);
                            } else {
                                const fallb = document.createElement('div');
                                fallb.style.cssText = "width: 24px; height: 24px; border-radius: 50%; background: #e0e0e0; color: #555; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; overflow: hidden;";
                                fallb.title = (chrome.i18n.getMessage('label_assigned_to') || "Assigné à:") + " " + initials;
                                fallb.textContent = initials;
                                row1Right.appendChild(fallb);
                            }

                            const statusDot = document.createElement('div');
                            statusDot.className = "rt-status-dot";
                            statusDot.title = (chrome.i18n.getMessage('label_status') || "Statut:") + " " + statusLabelText;
                            statusDot.style.cssText = `width: 10px; height: 10px; border-radius: 50%; background-color: ${statusColor}; border: 1px solid #fff; box-shadow: 0 0 0 1px #eee;`;
                            row1Right.appendChild(statusDot);

                            row1.appendChild(row1Right);
                            ticketEl.appendChild(row1);

                            // --- Ligne 2 ---
                            const row2 = document.createElement('div');
                            row2.style.cssText = "display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; font-size: 12px; color: #666;";

                            const dateEl = document.createElement('div');
                            dateEl.style.cssText = "display: flex; align-items: center; gap: 4px; color: #6a7491;";
                            dateEl.title = chrome.i18n.getMessage('label_creation_date') || "Date de création";
                            dateEl.innerHTML = `<i class="far fa-calendar-alt"></i> `;
                            dateEl.appendChild(document.createTextNode(dateFormatted));
                            
                            if (elapsedTimeStr) {
                                const sep = document.createElement('span');
                                sep.style.cssText = "color: #ccc; margin: 0 4px;";
                                sep.textContent = "•";
                                dateEl.appendChild(sep);
                                
                                const elap = document.createElement('span');
                                elap.style.cssText = "font-style: italic; color: #888;";
                                elap.textContent = elapsedTimeStr;
                                dateEl.appendChild(elap);
                            }

                            row2.appendChild(dateEl);

                            const progEl = document.createElement('div');
                            progEl.style.cssText = "font-weight: bold; font-size: 14px; color: #000;";
                            progEl.title = chrome.i18n.getMessage('label_progression') || "Progression";
                            progEl.textContent = `${progressPct}%`;
                            row2.appendChild(progEl);

                            ticketEl.appendChild(row2);

                            // --- Ligne 3 ---
                            const subjectEl = document.createElement('div');
                            subjectEl.className = "rt-subject";
                            // Le titre alt sur le subect pourrait contenir du XSS si mis direct, donc on utilise setAttribute
                            subjectEl.setAttribute('title', ticket.subject || "");
                            subjectEl.style.cssText = "font-size: 12px; color: #555; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;";
                            subjectEl.textContent = subject; // textContent prévient du XSS

                            ticketEl.appendChild(subjectEl);

                            // Finalisation
                            recentTicketsList.appendChild(ticketEl);
                        });
                    } else {
                        recentTicketsList.innerHTML = `<div style="text-align: center; color: #999;font-size: 11px; padding: 10px;">Aucun ticket récent trouvé (ou accès API refusé pour cet utilisateur).</div>`;
                    }
                } else {
                    recentTicketsList.innerHTML = '';
                    const d = document.createElement('div'); d.style.cssText = "text-align: center; color: #e74c3c;font-size: 11px; padding: 10px;";
                    d.textContent = `Erreur API (${response.status})`;
                    recentTicketsList.appendChild(d);
                }
            } catch (error) {
                recentTicketsList.innerHTML = '';
                const d = document.createElement('div'); d.style.cssText = "text-align: center; color: #e74c3c;font-size: 11px; padding: 10px;";
                d.textContent = `Erreur JS: ${error.message}`;
                recentTicketsList.appendChild(d);
            }
        }

        // Fonction pour charger les dernières opportunités (Projets)
        
        function renderOppItemHtml(project, doliBaseUrl, usersList, customOppDict, oppOriginDict, dolibarrNativeInputReasons) {
            let subject = project.title || project.ref || "Projet sans titre";
            if (subject.length > 50) subject = subject.substring(0, 50) + '...';

            let statusColor = "#95a5a6";
            const stat = String(project.statut || project.status || "0");
            
            let statusLabelText = stat;
            const oppStatusMap = {
                "0": "Brouillon",
                "1": "Validé / Ouvert",
                "2": "Clôturé"
            };
            if (oppStatusMap[stat]) statusLabelText = oppStatusMap[stat];
            if (project.status_label) statusLabelText = project.status_label;
            else if (project.statut_label) statusLabelText = project.statut_label;

            if (stat === "0") statusColor = "#3498db"; // Brouillon
            else if (stat === "1") statusColor = "#27ae60"; // Validé/Ouvert
            else if (stat === "2") statusColor = "#7f8c8d"; // Clôturé

            const projectRef = project.ref || `PROJ #${project.id}`;
            
            let dateCStr = "";
            if (project.date_c) {
                const d = new Date(project.date_c * 1000);
                dateCStr = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
            }
            
            let initials = "?";
            if (project.user_author_id) {
                const u = usersList.find(u => u.id == project.user_author_id);
                if (u) {
                    const parts = [u.firstname, u.lastname].filter(Boolean);
                    if (parts.length >= 2) initials = parts[0].charAt(0).toUpperCase() + parts[1].charAt(0).toUpperCase();
                    else if (parts.length === 1) initials = parts[0].substring(0, 2).toUpperCase();
                    else if (u.login) initials = u.login.substring(0, 2).toUpperCase();
                } else {
                    initials = `U${project.user_author_id}`;
                }
            }

            let amountDisplay = project.opp_amount ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(project.opp_amount) : '';
            let probDisplay = project.opp_percent ? `${Math.round(parseFloat(project.opp_percent))} %` : '';

            const opts = project.array_options || {};
            const oppNom = opts.options_reedcrm_lastname || '';
            const oppPrenom = opts.options_reedcrm_firstname || '';
            const oppTel = opts.options_projectphone || '';
            const oppEmail = opts.options_reedcrm_email || '';
            const oppWebsite = opts.options_reedcrm_website || opts.options_website || project.url || '';
            const oppOriginRaw = opts.options_opporigin || opts.options_origine_opportunite || opts.options_origine || opts.options_origin || opts.options_source || opts.options_provenance || opts.options_prov || opts.options_opp_origin || opts.options_canal || '';
            
            let mappedOrigin = oppOriginRaw;
            if (oppOriginRaw && customOppDict && customOppDict[oppOriginRaw]) {
                mappedOrigin = customOppDict[oppOriginRaw];
            } else if (oppOriginRaw && oppOriginDict && oppOriginDict[oppOriginRaw]) {
                mappedOrigin = oppOriginDict[oppOriginRaw];
            } else if (oppOriginRaw && dolibarrNativeInputReasons[oppOriginRaw]) {
                mappedOrigin = dolibarrNativeInputReasons[oppOriginRaw];
            }
            
            const oppOrigin = typeof mappedOrigin === 'string' ? mappedOrigin.charAt(0).toUpperCase() + mappedOrigin.slice(1).replace(/_/g, ' ') : mappedOrigin;

            
            const prenomVal = oppPrenom || "";
            const nomVal = oppNom || "";
            const telVal = oppTel || "";
            const emailVal = oppEmail || "";
            const websiteVal = oppWebsite || "";

            let line1Html = `<div style="display: flex; align-items: center; gap: 4px;">` +
                            `<span class="inline-editable ${!prenomVal ? 'placeholder-text' : ''}" data-field="options_reedcrm_firstname" data-pid="${project.id}" data-val="${prenomVal}" title="Cliquez pour modifier">${prenomVal || 'Prénom'}</span> ` +
                            `<span class="inline-editable ${!nomVal ? 'placeholder-text' : ''}" data-field="options_reedcrm_lastname" data-pid="${project.id}" data-val="${nomVal}" title="Cliquez pour modifier">${nomVal || 'Nom'}</span>` +
                            `</div>` +
                            `<span class="rt-sep">&bull;</span>` +
                            `<div style="display: flex; align-items: center; gap: 4px;">` +
                            `<span class="inline-editable ${!telVal ? 'placeholder-text' : ''}" data-field="options_projectphone" data-pid="${project.id}" data-val="${telVal}" title="Cliquez pour modifier">${telVal || '0102030405'}</span>` +
                            `<svg class="copy-icon" data-copy-target="tel" data-copy="${telVal}" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" title="Copier le numéro"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>` +
                            `</div>`;

            let displayEmail = emailVal.length > 45 ? emailVal.substring(0, 45) + '...' : emailVal;
            let line2Html = `<div style="display: flex; align-items: center; gap: 4px;">` +
                            `<span class="inline-editable ${!emailVal ? 'placeholder-text' : ''}" data-field="options_reedcrm_email" data-pid="${project.id}" data-val="${emailVal}" title="Cliquez pour modifier">${displayEmail || 'nomail@nomail.com'}</span>` +
                            `<svg class="copy-icon" data-copy-target="email" data-copy="${emailVal}" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" title="Copier l'email"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>` +
                            `</div>`;
            
            let line3Html = `<div class="rt-contact-line-web" style="display: flex; align-items: center; gap: 4px;">` +
                            `<span class="inline-editable ${!websiteVal ? 'placeholder-text' : ''}" data-field="options_reedcrm_website" data-pid="${project.id}" data-val="${websiteVal}" title="Cliquez pour modifier">${websiteVal || 'https://www.website.com'}</span>` +
                            (websiteVal ? ` <a href="${websiteVal.startsWith('http') ? websiteVal : 'https://' + websiteVal}" target="_blank" class="rt-contact-link"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg></a>` : '') +
                            `</div>`;
            
            let contactHtml = '';
            if (line1Html !== '' || line2Html !== '' || line3Html !== '' || oppOrigin !== '') {
                contactHtml = `<div class="rt-contact">`;
                if (line1Html !== '') {
                    contactHtml += `<div class="rt-contact-line1 rt-contact-line">${line1Html}</div>`;
                }
                if (line2Html !== '') {
                    contactHtml += `<div class="rt-contact-line2 rt-contact-line" style="margin-top: 1px;">${line2Html}</div>`;
                }
                if (line3Html !== '') {
                    contactHtml += `<div class="rt-contact-line-web rt-contact-line" style="margin-top: 1px;">${line3Html}</div>`;
                }
                if (oppOrigin !== '') {
                    contactHtml += `<div class="rt-contact-line3" style="margin-top: 3px; display: flex; align-items: center; color: #475569; font-size: 11px;">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                        <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1;" title="${oppOrigin}">${oppOrigin}</span>
                    </div>`;
                }
                contactHtml += `</div>`;
            }

            const fullName = `${prenomVal} ${nomVal}`.trim();
            const searchString = (projectRef + ' ' + subject + ' ' + fullName + ' ' + oppTel + ' ' + oppEmail).toLowerCase().replace(/['"]/g, '');

            return `
        <div id="opp-list-item-${project.id}" class="recent-ticket-item opp-list-item" style="align-items: flex-start;" data-search="${searchString}" data-date="${project.date_c || 0}" data-stat="${stat}">
            <div class="rt-left">
                <div class="rt-ref-group" style="display: flex; align-items: center; gap: 6px; white-space: nowrap;">
                    <a href="${doliBaseUrl}/projet/card.php?id=${project.id}" target="_blank" class="rt-ref" title="Ouvrir le projet">${projectRef}</a>
                    ${dateCStr ? `<span class="rt-sep">&bull;</span><div style="font-size: 10px; color: #888;">${dateCStr}</div>` : ''}
                    ${initials !== "?" ? `<span class="rt-sep">&bull;</span><div style="font-size: 9px; background: #e2e8f0; color: #475569; padding: 1px 4px; border-radius: 4px;" title="Créé par">#${initials}</div>` : ''}
                </div>
                <div class="rt-subject" title="${subject.replace(/"/g, '')}" style="display: flex; align-items: center; gap: 6px; margin-top: 3px;">
                    <div class="rt-status-dot" title="Statut: ${statusLabelText}" style="width: 8px; height: 8px; border-radius: 50%; background-color: ${statusColor}; flex-shrink: 0;"></div>
                    <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; flex: 1; font-size: 13px; color: #334155; font-weight: 400;">${subject}</span>
                </div>
                ${contactHtml}
            </div>
            <div class="rt-right" style="display: flex; flex-direction: column; align-items: flex-end; justify-content: flex-start;">
                <div class="rt-stats" style="font-size: 13px; font-weight: 400; display: flex; flex-direction: column; align-items: flex-end; gap: 2px; white-space: nowrap;">
                    <span class="inline-editable ${!project.opp_percent ? 'placeholder-text' : ''}" data-field="opp_percent" data-pid="${project.id}" data-val="${project.opp_percent || ''}" title="Cliquez pour modifier le pourcentage" style="color: #1e293b;">${probDisplay || '0 %'}</span>
                    <span class="inline-editable ${!project.opp_amount ? 'placeholder-text' : ''}" data-field="opp_amount" data-pid="${project.id}" data-val="${project.opp_amount || ''}" title="Cliquez pour modifier le montant" style="color: #1e293b;">${amountDisplay || '0 €'}</span>
                </div>
            </div>
        </div>`;
        }

        async function loadRecentOpportunities(apiUrl, token, limit = 10, entity, doliOppOnly = true, usersPromise = null, customDictMapStr = "") {
            recentOppContainer.classList.remove('hidden');
            recentOppList.innerHTML = `
                <div class="loader-container">
                    <div class="loader-spinner"></div>
                    <div>${chrome.i18n.getMessage("popup_20")}</div>
                </div>
            `;

            try {
                const doliBaseUrl = apiUrl.replace(/\/api\/index\.php\/?$/, '');
                const headers = { 'DOLAPIKEY': token, 'Accept': 'application/json' };
                if (entity && String(entity).trim() !== '') {
                    headers['DOLAPIENTITY'] = String(entity).trim();
                }

                // On demande directement les derniers projets créés (t.rowid DESC) 
                // pour s'assurer d'avoir les opportunités les plus récentes.
                const response = await fetchDoli(`${apiUrl}/projects?sortfield=t.rowid&sortorder=DESC&limit=100`, {
                    method: 'GET',
                    headers: headers
                });

                if (response.ok) {
                    const textData = await response.text();
                    const projects = textData.trim() ? JSON.parse(textData) : [];

                    if (Array.isArray(projects) && projects.length > 0) {
                        let oppProjects = projects;
                        if (doliOppOnly) {
                            oppProjects = projects.filter(p => p.usage_opportunity == 1 || p.usage_opportunity === "1");
                        }

                        if (oppProjects.length > 0) {
                            let customOppDict = {};
                            
                            // 0. Injection du dictionnaire personnalisé de l'utilisateur (depuis Profils)
                            if (customDictMapStr) {
                                customDictMapStr.split(/\r?\n/).forEach(line => {
                                    if(line.includes(':')){
                                        let [k,v] = line.split(':');
                                        k = k.replace(/^[iI][dD]\s*/, '').trim();
                                        if (k && v.trim()) customOppDict[k] = v.trim();
                                    } else if(line.includes('=')){
                                        let [k,v] = line.split('=');
                                        k = k.replace(/^[iI][dD]\s*/, '').trim();
                                        if (k && v.trim()) customOppDict[k] = v.trim();
                                    }
                                });
                            }
                            
                            let oppOriginDict = {};
                            
                            // 1. Cas où l'origine est tirée d'une table dictionnaire (sellist) comme c_input_reason
                            try {
                                const dictRes = await fetchDoli(`${apiUrl}/setup/dictionary/c_input_reason`, { headers: headers });
                                if (dictRes.ok) {
                                    const dictJson = await dictRes.json();
                                    if (Array.isArray(dictJson)) {
                                        dictJson.forEach(row => {
                                            const rowId = row.id || row.rowid;
                                            if (rowId) {
                                                oppOriginDict[rowId.toString()] = row.label || row.libelle || row.code;
                                            }
                                        });
                                    }
                                }
                            } catch(e) { console.warn("Erreur fetch dictionary", e); }

                            // 1.b Fallback : Si l'API renvoie 404 (non exposé), on injecte le dictionnaire natif Dolibarr de base (c_input_reason)
                            const dolibarrNativeInputReasons = {
                                "1": "Campagne d'emailing",
                                "2": "Campagne Fax",
                                "3": "Campagne Publipostage",
                                "4": "Campagne Téléphonique",
                                "5": "Contact commercial",
                                "6": "Contact entrant",
                                "7": "Employé",
                                "8": "Internet",
                                "9": "Partenaire",
                                "10": "Contact en boutique",
                                "11": "Parrainage",
                                "12": "Bouche à oreille"
                            };

                            // 2. Cas où l'origine est une simple liste déroulante (select) gérée dans les paramètres de l'extrafield
                            try {
                                const efRes = await fetchDoli(`${apiUrl}/setup/extrafields`, { headers: headers });
                                if (efRes.ok) {
                                    const efJson = await efRes.json();
                                    let oField = null;
                                    
                                    // Dolibarr API generally returns an array of objects for extrafields
                                    if (Array.isArray(efJson)) {
                                        oField = efJson.find(f => f.name === 'opporigin' || f.name === 'origine_opportunite' || f.name === 'origine');
                                    } else {
                                        // Fallback if it returns a grouped object
                                        const pFields = efJson.project || efJson.projet || efJson;
                                        oField = pFields.options_opporigin || pFields.opporigin || pFields.origine_opportunite || pFields.options_origine_opportunite;
                                    }

                                    if (oField && oField.param) {
                                        if (typeof oField.param === 'string') {
                                            oField.param.split(/\r?\n/).forEach(line => {
                                                const parts = line.split(',');
                                                if (parts.length >= 2) oppOriginDict[parts[0].trim()] = parts.slice(1).join(',').trim();
                                            });
                                        } else if (typeof oField.param === 'object') {
                                            const paramsToMerge = oField.param.options || oField.param;
                                            Object.keys(paramsToMerge).forEach(k => {
                                                oppOriginDict[k.toString()] = paramsToMerge[k];
                                            });
                                        }
                                    }
                                }
                            } catch(e) { console.warn("Erreur fetch extrafields", e); }

                            recentOppList.innerHTML = ''; // Nettoyer
                            const sortedProjects = oppProjects.sort((a, b) => b.date_c - a.date_c).slice(0, limit);
                            
                            let usersList = [];
                            if (usersPromise) {
                                try { usersList = await usersPromise || []; } catch(e) { console.error("Erreur attente users dans opp", e); }
                            }

                            sortedProjects.forEach(project => {
                                const html = renderOppItemHtml(project, doliBaseUrl, usersList, customOppDict, oppOriginDict, dolibarrNativeInputReasons);
                                recentOppList.insertAdjacentHTML('beforeend', html);

                            });
                        } else {
                            recentOppList.innerHTML = `<div style="text-align: center; color: #999;font-size: 11px; padding: 10px;">Aucune opportunité trouvée.</div>`;
                        }
                    } else {
                        recentOppList.innerHTML = `<div style="text-align: center; color: #999;font-size: 11px; padding: 10px;">Aucune opportunité trouvée.</div>`;
                    }
                } else {
                    recentOppList.innerHTML = '';
                    const d = document.createElement('div'); d.style.cssText = "text-align: center; color: #e74c3c;font-size: 11px; padding: 10px;";
                    d.textContent = `Erreur API (${response.status})`;
                    recentOppList.appendChild(d);
                }
            } catch (error) {
                recentOppList.innerHTML = '';
                const d = document.createElement('div'); d.style.cssText = "text-align: center; color: #e74c3c;font-size: 11px; padding: 10px;";
                d.textContent = `Erreur JS: ${error.message}`;
                recentOppList.appendChild(d);
            }
        }

        async function loadAllOpportunities(apiUrl, token, limit, listCount, entity, doliOppOnly, isBackground = false) {
            const allOppList = document.getElementById('all-opp-list');
            if (!allOppList) return;
            
            if (!isBackground) {
                allOppList.innerHTML = `
                    <div class="loader-container">
                        <div class="loader-spinner"></div>
                        <div>${chrome.i18n.getMessage("popup_20")}</div>
                    </div>
                `;
            }

            try {
                const headers = {
                    'DOLAPIKEY': token,
                    'Accept': 'application/json'
                };
                if (entity && String(entity).trim() !== '') {
                    headers['DOLAPIENTITY'] = String(entity).trim();
                }

                // Fetch locally with high limit for JS filtering
                const response = await fetchDoli(`${apiUrl}/projects?sortfield=t.rowid&sortorder=DESC&limit=${limit}`, {
                    method: 'GET',
                    headers: headers
                });

                if (response.ok) {
                    const projects = await response.json();
                    
                    if (Array.isArray(projects) && projects.length > 0) {
                        let oppProjects = projects;
                        
                        if (doliOppOnly) {
                            try {
                                const activeProfile = getActiveProfile();
                                const doliVersion = activeProfile && activeProfile.doliVersion ? activeProfile.doliVersion : "20.0";
                                const isOldDoli = parseFloat(doliVersion) < 20;

                                oppProjects = projects.filter(p => {
                                    if (isOldDoli && p.usage_bill_time === "1" && p.usage_opportunity !== "1") {
                                        return false; 
                                    }
                                    return p.usage_opportunity == 1 || p.usage_opportunity === "1";
                                });
                            } catch(e) {
                                oppProjects = projects.filter(p => p.usage_opportunity == 1 || p.usage_opportunity === "1");
                            }
                        }

                        if (oppProjects.length > 0) {
                            if (!isBackground) allOppList.innerHTML = '';
                            const sortedProjects = oppProjects.sort((a, b) => b.date_c - a.date_c);
                            
                            // Get users
                            let usersList = [];
                            try {
                                const uRes = await fetchDoli(`${apiUrl}/users?limit=500`, { method: 'GET', headers: headers });
                                if (uRes.ok) usersList = await uRes.json();
                            } catch(e) {}
                            
                            // Dictionary maps (native)
                            const dolibarrNativeInputReasons = {
                                "1": "Campagne d'emailing",
                                "2": "Campagne Fax",
                                "3": "Campagne Publipostage",
                                "4": "Campagne Téléphonique",
                                "5": "Contact commercial",
                                "6": "Contact entrant",
                                "7": "Employé",
                                "8": "Internet",
                                "9": "Partenaire",
                                "10": "Contact en boutique",
                                "11": "Parrainage",
                                "12": "Bouche à oreille"
                            };

                            let customOppDict = {};
                            let oppOriginDict = {};
                            
                            // Get dictionaries
                            try {
                                const activeProfile = getActiveProfile();
                                if (activeProfile && activeProfile.doliDictMap) {
                                    activeProfile.doliDictMap.split(/\r?\n/).forEach(line => {
                                        const parts = line.split(':');
                                        if (parts.length >= 2) customOppDict[parts[0].trim()] = parts.slice(1).join(':').trim();
                                    });
                                }

                                const efRes = await fetchDoli(`${apiUrl}/setup/extrafields`, { method: 'GET', headers: headers });
                                if (efRes.ok) {
                                    const efJson = await efRes.json();
                                    let oField = null;
                                    if (Array.isArray(efJson)) {
                                        oField = efJson.find(f => f.name === 'opporigin' || f.name === 'origine_opportunite' || f.name === 'origine');
                                    } else {
                                        const pFields = efJson.project || efJson.projet || efJson;
                                        oField = pFields.options_opporigin || pFields.opporigin || pFields.origine_opportunite || pFields.options_origine_opportunite;
                                    }

                                    if (oField && oField.param) {
                                        if (typeof oField.param === 'string') {
                                            oField.param.split(/\r?\n/).forEach(line => {
                                                const parts = line.split(',');
                                                if (parts.length >= 2) oppOriginDict[parts[0].trim()] = parts.slice(1).join(',').trim();
                                            });
                                        } else if (typeof oField.param === 'object') {
                                            const paramsToMerge = oField.param.options || oField.param;
                                            Object.keys(paramsToMerge).forEach(k => {
                                                oppOriginDict[k.toString()] = paramsToMerge[k];
                                            });
                                        }
                                    }
                                }
                            } catch(e) {}

                            // Extract the domain
                            let doliBaseUrl = apiUrl.replace('/api/index.php', '').replace('/api', '');

                            let openCount = 0;
                            let renderedCount = document.querySelectorAll('.opp-list-item').length;
                            sortedProjects.forEach((project, index) => {
                                if (String(project.statut || project.status || "0") === "1") openCount++;
                                
                                // Prevent re-rendering if it already exists
                                if (isBackground && document.getElementById(`opp-list-item-${project.id}`)) {
                                    return;
                                }

                                const html = renderOppItemHtml(project, doliBaseUrl, usersList, customOppDict, oppOriginDict, dolibarrNativeInputReasons);
                                
                                // Create logic wrapper to handle initial display vs hidden
                                const parser = new DOMParser();
                                const doc = parser.parseFromString(html, 'text/html');
                                const itemNode = doc.body.firstElementChild; // FIX: Use firstElementChild to avoid text nodes
                                
                                if (itemNode) {
                                    if (index >= listCount) {
                                        itemNode.style.display = 'none';
                                        itemNode.classList.add('initially-hidden');
                                    } else {
                                        itemNode.classList.add('initially-visible');
                                    }
                                    
                                    allOppList.appendChild(itemNode);
                                    renderedCount++;
                                }
                            });
                            if (typeof applyOppFilters === 'function') {
                                applyOppFilters();
                            }
                            
                            const countEl = document.getElementById('opp-count-total');
                            if (countEl) {
                                if (isBackground || limit >= 1000) {
                                    countEl.textContent = openCount;
                                } else {
                                    countEl.innerHTML = `<div class="loader-spinner small" style="border-top-color: #c0392b; border-color: rgba(192,57,43,0.3); border-top-color: #c0392b; width: 10px; height: 10px; border-width: 2px;"></div><span style="font-size:10px;">chargement...</span>`;
                                }
                            }

                        } else {
                            allOppList.innerHTML = `<div style="text-align: center; color: #999;font-size: 11px; padding: 10px;">${chrome.i18n.getMessage('popup_js_110')}</div>`;
                            const countEl = document.getElementById('opp-count-total');
                            if (countEl) countEl.textContent = "0";
                        }
                    } else {
                        allOppList.innerHTML = `<div style="text-align: center; color: #999;font-size: 11px; padding: 10px;">${chrome.i18n.getMessage('popup_js_110')}</div>`;
                    }
                } else {
                    allOppList.innerHTML = `<div style="text-align: center; color: #e74c3c;font-size: 11px; padding: 10px;">Erreur API (${response.status})</div>`;
                }
            } catch (error) {
                allOppList.innerHTML = `<div style="text-align: center; color: #e74c3c;font-size: 11px; padding: 10px;">Erreur JS: ${error.message}</div>`;
            }
        }


        // Vérifie si l'API est configurée et gère le multi-profils
        chrome.storage.sync.get(['doliProfiles', 'doliActiveProfileId', 'doliDefaultView', 'doliRecentCount', 'doliListCount', 'doliApiLimit'], (items) => {
            const profiles = items.doliProfiles || [];
            const activeId = items.doliActiveProfileId;
            let p = profiles.find(prof => prof.id === activeId);

            // Fallback si l'ID n'est pas trouvé mais qu'il y a des profils
            if (!p && profiles.length > 0) {
                p = profiles[0];
                chrome.storage.sync.set({ doliActiveProfileId: p.id });
            }

            // Gestion du Switcher de Profils UI
            const profileSwitcher = document.getElementById('doli-active-profile');
            const navFavicon = document.getElementById('nav-favicon');

            if (profiles.length > 1) {
                profileSwitcher.classList.remove('hidden');
                profileSwitcher.innerHTML = '';
                profiles.forEach(prof => {
                    const opt = document.createElement('option');
                    opt.value = prof.id;
                    opt.textContent = prof.name || 'Profil';
                    if (prof.id === p?.id) opt.selected = true;
                    profileSwitcher.appendChild(opt);
                });

                // Écouteur pour changer de profil à la volée
                profileSwitcher.addEventListener('change', (e) => {
                    chrome.storage.sync.set({ doliActiveProfileId: e.target.value }, () => {
                        window.location.reload(); // On recharge brutalement le popup pour ré-appliquer les configs
                    });
                });
            } else if (profiles.length === 1) {
                profileSwitcher.classList.add('hidden'); // S'il n'y a qu'un profil on le cache
            }

            // Affichage du favicon si le sélecteur est visible et que le profil a une URL
            if (p && p.doliUrl && p.doliApiToken && profileSwitcher && !profileSwitcher.classList.contains('hidden')) {
                (async () => {
                    try {
                        const headers = { 'DOLAPIKEY': p.doliApiToken, 'Accept': 'application/json' };
                        if (p.doliEntity) headers['DOLAPIENTITY'] = String(p.doliEntity).trim();
                        
                        const compRes = await fetchDoli(`${p.doliUrl}/setup/company`, { headers });
                        if (!compRes.ok) throw new Error('Company fetch failed');
                        const compData = await compRes.json();
                        
                        const logoName = compData.logo_squarred || compData.logo;
                        if (!logoName) throw new Error('No logo found');
                        
                        let filePath = 'logos/' + logoName;
                        let isSquarred = (logoName === compData.logo_squarred);
                        
                        let docRes = await fetchDoli(`${p.doliUrl}/documents/download?modulepart=mycompany&original_file=${encodeURIComponent(filePath)}`, { headers });
                        
                        // Si introuvable dans logos/, et que c'est un logo carré, il a peut-être été auto-généré dans thumbs/
                        if (!docRes.ok && isSquarred) {
                            filePath = 'logos/thumbs/' + logoName;
                            docRes = await fetchDoli(`${p.doliUrl}/documents/download?modulepart=mycompany&original_file=${encodeURIComponent(filePath)}`, { headers });
                        }
                        
                        // Si toujours introuvable (ou si ce n'était pas un logo carré mais le principal introuvable)
                        if (!docRes.ok) {
                            // On essaie de retomber sur le logo principal si le carré a planté
                            if (isSquarred && compData.logo && compData.logo !== compData.logo_squarred) {
                                filePath = 'logos/' + compData.logo;
                                docRes = await fetchDoli(`${p.doliUrl}/documents/download?modulepart=mycompany&original_file=${encodeURIComponent(filePath)}`, { headers });
                            }
                            
                            if (!docRes.ok) {
                                throw new DoliError('ReedCRM-2003'); // Erreur "manque logo" générique pour catch par le UI
                            }
                        }
                        
                        const docData = await docRes.json();
                        if (docData && docData.content) {
                            const contentType = docData['content-type'] || 'image/png';
                            if (navFavicon) {
                                navFavicon.src = `data:${contentType};base64,${docData.content}`;
                                navFavicon.style.display = 'block';
                                profileSwitcher.classList.add('has-favicon');
                            }
                            return; // Success
                        }
                    } catch (err) {
                        try {
                            const domain = new URL(p.doliUrl).origin;
                            if (navFavicon) {
                                navFavicon.src = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
                                navFavicon.style.display = 'block';
                                profileSwitcher.classList.add('has-favicon');
                            }
                        } catch (e) {}

                        // Affichage de l'avertissement de performance si DoliError
                        if (err instanceof DoliError && err.code === 'ReedCRM-2003') {
                            const warnBox = document.getElementById('performance-warning');
                            const warnTxt = document.getElementById('performance-warning-text');
                            const warnLink = document.getElementById('performance-warning-link');
                            if (warnBox && warnTxt && warnLink) {
                                warnTxt.textContent = err.userMessage;
                                warnLink.textContent = chrome.i18n.getMessage('btn_fix_logo') || "Générer";
                                
                                let guiUrl = p.doliUrl;
                                if (guiUrl.endsWith('/api/index.php')) {
                                    guiUrl = guiUrl.substring(0, guiUrl.length - '/api/index.php'.length);
                                } else if (guiUrl.includes('/api/index.php/')) {
                                    guiUrl = guiUrl.split('/api/index.php/')[0];
                                }
                                warnLink.href = `${guiUrl}/admin/company.php`;
                                
                                warnBox.classList.remove('hidden');
                            }
                        }
                    }
                })();
            }

            // --- SUITE LOGIQUE HABITUELLE (avec le profil P) ---
            if (p && p.doliUrl && p.doliApiToken) {
                // Configuration OK, on affiche le formulaire
                setupWarning.classList.add('hidden');
                ticketForm.classList.remove('hidden');
                btnSubmit.disabled = false;
                btnSubmit.querySelector('.btn-text span[data-i18n]').textContent = chrome.i18n.getMessage('popup_js_111');

                if (oppForm) {
                    oppForm.classList.remove('hidden');
                    btnSubmitOpp.disabled = false;
                    btnSubmitOpp.querySelector('.btn-text span[data-i18n]').textContent = chrome.i18n.getMessage('popup_34');
                }

                const oppOnly = p.doliOppOnly !== false; // true par défaut
                let activeTab = items.doliDefaultView === 'opportunite' ? 'opportunite' : 'ticket';

                // Chargement des utilisateurs en arrière-plan (on garde la promesse)
                const usersPromise = loadUsers(p.doliUrl, p.doliApiToken, p.doliLogin, p.doliAutoAssign, p.doliEntity);

                // Chargement des Tiers (Clients/Prospects) et stockage de la promesse
                const thirdpartiesPromise = loadThirdparties(p.doliUrl, p.doliApiToken, p.doliEntity);
                
                // Ecouteur sur le champ Tiers pour charger les Contacts et Projets
                const tiersSelect = document.getElementById('ticket-tiers');
                if (tiersSelect) {
                    tiersSelect.addEventListener('change', (e) => {
                        loadContacts(p.doliUrl, p.doliApiToken, p.doliEntity, e.target.value);
                        loadProjects(p.doliUrl, p.doliApiToken, p.doliEntity, e.target.value);
                    });
                }

                // Fetch les derniers tickets avec la limite choisie par l'utilisateur (défaut: 10)
                const recentLimit = items.doliRecentCount !== undefined ? parseInt(items.doliRecentCount, 10) || 10 : 10;
                const listCount = items.doliListCount !== undefined ? parseInt(items.doliListCount, 10) || 15 : 15;
                const apiLimit = items.doliApiLimit !== undefined ? parseInt(items.doliApiLimit, 10) || 5000 : 5000;
                loadRecentTickets(p.doliUrl, p.doliApiToken, recentLimit, p.doliEntity, usersPromise, thirdpartiesPromise);
                loadRecentOpportunities(p.doliUrl, p.doliApiToken, recentLimit, p.doliEntity, oppOnly, usersPromise, p.doliDictMap || "");
                
                // Progressive loading: first 100 fast, then the rest in background
                const quickLimit = 100;
                if (apiLimit > quickLimit) {
                    loadAllOpportunities(p.doliUrl, p.doliApiToken, quickLimit, listCount, p.doliEntity, oppOnly, false).then(() => {
                        loadAllOpportunities(p.doliUrl, p.doliApiToken, apiLimit, listCount, p.doliEntity, oppOnly, true);
                    });
                } else {
                    loadAllOpportunities(p.doliUrl, p.doliApiToken, apiLimit, listCount, p.doliEntity, oppOnly, false);
                }

                // Optionnel: copier les assignees dans le select opp s'il se charge 
                const setupOppAssignees = () => {
                    oppAssigneeSelect.innerHTML = assigneeSelect.innerHTML;
                    oppAssigneeSelect.value = assigneeSelect.value;

                    if (!window.oppAssigneeCustomSelect) {
                        window.oppAssigneeCustomSelect = new CustomSelect(oppAssigneeSelect);
                    } else {
                        window.oppAssigneeCustomSelect.update();
                    }
                };
                usersPromise.then(setupOppAssignees);

                // Vérification des droits GED pour afficher un avertissement si nécessaire
                const gedWarning = document.getElementById('ged-warning');
                if (gedWarning && p.doliStatus && p.doliStatus.ged !== 'ok') {
                    gedWarning.classList.remove('hidden');
                }

                // Vérification si des données doivent être pré-remplies (Nextcloud Mail ou Screenshot Return)
                const prefillKeys = [
                    'doliPrefillSubject', 'doliPrefillMessage', 'doliPrefillAssignee', 'doliActiveTab',
                    'doliPrefillOppNom', 'doliPrefillOppPrenom', 'doliPrefillOppTel', 'doliPrefillOppEmail',
                    'doliPrefillOppProba', 'doliPrefillOppMontant', 'doliPrefillTicketTiers', 'doliPrefillTicketContact', 'doliPrefillTicketProject'
                ];
                
                const profId = p.id || 'default';
                const draftOppKey = `draftOpp_${profId}`;
                const draftTicketKey = `draftTicket_${profId}`;
                const draftSharedKey = `draftShared_${profId}`;
                
                chrome.storage.local.get([...prefillKeys, draftOppKey, draftTicketKey, draftSharedKey], async (localItems) => {
                    
                    // Activation de l'onglet par défaut IMMEDIATEMENT pour ne pas avoir un écran vide
                    if (localItems.doliActiveTab) {
                        activeTab = localItems.doliActiveTab;
                    }
                    switchTab(activeTab);

                    // 1. Restauration des drafts (brouillons) spécifiques au profil
                    if (localItems[draftTicketKey]) {
                        const dt = localItems[draftTicketKey];
                        if (dt.subject !== undefined) document.getElementById('ticket-subject').value = dt.subject;
                        if (dt.message !== undefined) document.getElementById('ticket-message').value = dt.message;
                        if (dt.assignee !== undefined && dt.assignee !== '') {
                            await usersPromise;
                            assigneeSelect.value = dt.assignee;
                        }
                    }
                    if (localItems[draftOppKey]) {
                        const drop = localItems[draftOppKey];
                        if (drop.subject !== undefined) document.getElementById('opp-subject').value = drop.subject;
                        if (drop.message !== undefined) document.getElementById('opp-message').value = drop.message;
                        if (drop.nom !== undefined) document.getElementById('opp-nom').value = drop.nom;
                        if (drop.prenom !== undefined) document.getElementById('opp-prenom').value = drop.prenom;
                        if (drop.tel !== undefined) document.getElementById('opp-tel').value = drop.tel;
                        if (drop.email !== undefined) document.getElementById('opp-email').value = drop.email;
                        if (drop.proba !== undefined) {
                            const probaInput = document.getElementById('opp-proba');
                            if (probaInput) {
                                probaInput.value = drop.proba;
                                const probaVal = document.getElementById('opp-proba-val');
                                if (probaVal) probaVal.textContent = chrome.i18n.getMessage('popup_js_113');
                            }
                        }
                        if (drop.montant !== undefined) document.getElementById('opp-montant').value = drop.montant;
                        if (drop.websiteProtocol !== undefined) document.getElementById('opp-website-protocol').value = drop.websiteProtocol;
                        if (drop.website !== undefined) document.getElementById('opp-website').value = drop.website;
                        if (drop.assignee !== undefined && drop.assignee !== '') {
                            await usersPromise;
                            if (oppAssigneeSelect) oppAssigneeSelect.value = drop.assignee;
                        }
                    }

                    // Tiers/Contact/Projet global depuis le draft ou le prefill
                    const doliTiers = localItems.doliPrefillTicketTiers || (localItems[draftSharedKey] ? localItems[draftSharedKey].tiers : '');
                    const doliContact = localItems.doliPrefillTicketContact || (localItems[draftSharedKey] ? localItems[draftSharedKey].contact : '');
                    const doliProject = localItems.doliPrefillTicketProject || (localItems[draftSharedKey] ? localItems[draftSharedKey].project : '');

                    // 2. Écrasement éventuel par les PREFILLS (Mail / Screenshot)
                    if (activeTab === 'opportunite') {
                        if (localItems.doliPrefillSubject) document.getElementById('opp-subject').value = localItems.doliPrefillSubject;
                        if (localItems.doliPrefillMessage) document.getElementById('opp-message').value = localItems.doliPrefillMessage;
                        if (localItems.doliPrefillAssignee) {
                            await usersPromise;
                            oppAssigneeSelect.value = localItems.doliPrefillAssignee;
                        }
                        if (localItems.doliPrefillOppNom) document.getElementById('opp-nom').value = localItems.doliPrefillOppNom;
                        if (localItems.doliPrefillOppPrenom) document.getElementById('opp-prenom').value = localItems.doliPrefillOppPrenom;
                        if (localItems.doliPrefillOppTel) document.getElementById('opp-tel').value = localItems.doliPrefillOppTel;
                        if (localItems.doliPrefillOppEmail) document.getElementById('opp-email').value = localItems.doliPrefillOppEmail;
                        if (localItems.doliPrefillOppProba) {
                            const probaInput = document.getElementById('opp-proba');
                            probaInput.value = localItems.doliPrefillOppProba;
                            const probaVal = document.getElementById('opp-proba-val');
                            if (probaVal) probaVal.textContent = chrome.i18n.getMessage('popup_js_114');
                        }
                        if (localItems.doliPrefillOppMontant) document.getElementById('opp-montant').value = localItems.doliPrefillOppMontant;
                    } else if (activeTab === 'ticket') {
                        if (localItems.doliPrefillSubject) document.getElementById('ticket-subject').value = localItems.doliPrefillSubject;
                        if (localItems.doliPrefillMessage) document.getElementById('ticket-message').value = localItems.doliPrefillMessage;
                        if (localItems.doliPrefillAssignee) {
                            await usersPromise; // On attend que la liste déroulante soit remplie
                            assigneeSelect.value = localItems.doliPrefillAssignee;
                        }
                    }

                    // On charge les sélections Tiers/Contact/Projet de façon globale
                    if (doliTiers) {
                        const tiersElem = document.getElementById('ticket-tiers');
                        if (tiersElem) {
                            // On attend un peu que la liste des tiers soit chargée
                            setTimeout(() => {
                                tiersElem.value = doliTiers;
                                if (window.ticketTiersSelect) window.ticketTiersSelect.update();
                                
                                // Déclencher le loadContacts
                                loadContacts(p.doliUrl, p.doliApiToken, p.doliEntity, doliTiers).then(() => {
                                    if (doliContact) {
                                        const contactElem = document.getElementById('ticket-contact');
                                        if (contactElem) {
                                            contactElem.value = doliContact;
                                            if (window.ticketContactSelect) window.ticketContactSelect.update();
                                        }
                                    }
                                });

                                // Déclencher le loadProjects
                                loadProjects(p.doliUrl, p.doliApiToken, p.doliEntity, doliTiers).then(() => {
                                    if (doliProject) {
                                        const projectElem = document.getElementById('ticket-project');
                                        if (projectElem) {
                                            projectElem.value = doliProject;
                                            if (window.ticketProjectSelect) window.ticketProjectSelect.update();
                                        }
                                    }
                                });
                            }, 500);
                        }
                    }

                    // On nettoie la mémoire locale pour ne pas pré-remplir la prochaine fois
                    chrome.storage.local.remove(prefillKeys);
                    
                    // --- Mise en place de la sauvegarde de brouillons sur tout changement ---
                    let draftTimeout;
                    
                    const performSaveDraft = () => {
                        const draftOpp = {
                            subject: document.getElementById('opp-subject').value,
                            message: document.getElementById('opp-message').value,
                            nom: document.getElementById('opp-nom').value,
                            prenom: document.getElementById('opp-prenom').value,
                            tel: document.getElementById('opp-tel').value,
                            email: document.getElementById('opp-email').value,
                            proba: document.getElementById('opp-proba').value,
                            montant: document.getElementById('opp-montant').value,
                            websiteProtocol: document.getElementById('opp-website-protocol').value,
                            website: document.getElementById('opp-website').value,
                            assignee: oppAssigneeSelect ? oppAssigneeSelect.value : ''
                        };
                        
                        const draftTicket = {
                            subject: document.getElementById('ticket-subject').value,
                            message: document.getElementById('ticket-message').value,
                            assignee: assigneeSelect ? assigneeSelect.value : ''
                        };
                        
                        const draftShared = {
                            tiers: document.getElementById('ticket-tiers') ? document.getElementById('ticket-tiers').value : '',
                            contact: document.getElementById('ticket-contact') ? document.getElementById('ticket-contact').value : '',
                            project: document.getElementById('ticket-project') ? document.getElementById('ticket-project').value : ''
                        };
                        chrome.storage.local.set({ [draftOppKey]: draftOpp, [draftTicketKey]: draftTicket, [draftSharedKey]: draftShared });
                    };

                    const saveDraftDebounced = () => {
                        clearTimeout(draftTimeout);
                        draftTimeout = setTimeout(performSaveDraft, 300);
                    };

                    const allInputs = document.querySelectorAll('#view-ticket input, #view-ticket textarea, #view-ticket select, #view-opportunity input, #view-opportunity textarea, #view-opportunity select, #ticket-top-actions select');
                    allInputs.forEach(el => {
                        el.addEventListener('input', saveDraftDebounced);
                        el.addEventListener('change', performSaveDraft);
                        el.addEventListener('blur', performSaveDraft);
                    });
                });
            } else {
                // Configuration manquante
                setupWarning.classList.remove('hidden');
                ticketForm.classList.add('hidden');
            }
        });

        // ----------------------------------------------------
        // -- GESTION SOUMISSION FORMULAIRE OPPORTUNITÉ --
        // ----------------------------------------------------
        if (oppForm) {
            const probaInput = document.getElementById('opp-proba');
            const probaVal = document.getElementById('opp-proba-val');
            if (probaInput && probaVal) {
                probaInput.addEventListener('input', () => {
                    probaVal.textContent = chrome.i18n.getMessage('popup_js_115');
                });
            }

            oppForm.addEventListener('submit', async (e) => {
                e.preventDefault();

                const subject = document.getElementById('opp-subject').value;
                let message = document.getElementById('opp-message').value;
                const fileInput = document.getElementById('opp-file');
                const nominee = document.getElementById('opp-nom').value;
                const prenom = document.getElementById('opp-prenom').value;
                const tel = document.getElementById('opp-tel').value;
                const email = document.getElementById('opp-email').value;
                const proba = document.getElementById('opp-proba').value;
                const montant = document.getElementById('opp-montant').value;
                const websiteProtocol = document.getElementById('opp-website-protocol').value;
                let websiteDomain = document.getElementById('opp-website').value.trim();
                const assigneeId = oppAssigneeSelect.value;
                
                const tiersSelectElem = document.getElementById('ticket-tiers');
                const tiersId = tiersSelectElem ? tiersSelectElem.value : '';
                
                const projectSelectElem = document.getElementById('ticket-project');
                const projectId = projectSelectElem ? projectSelectElem.value : '';

                btnSubmitOpp.disabled = true;
                btnSubmitOpp.classList.add('btn-loading');
                btnSubmitOpp.querySelector('.btn-text span[data-i18n]').textContent = chrome.i18n.getMessage('popup_js_116');
                oppStatusMessage.textContent = '';
                oppStatusMessage.style.color = '#333';

                try {
                    const items = await new Promise(resolve => chrome.storage.sync.get(['doliProfiles', 'doliActiveProfileId'], resolve));
                    const profiles = items.doliProfiles || [];
                    const p = profiles.find(prof => prof.id === items.doliActiveProfileId) || profiles[0];

                    if (!p || !p.doliUrl || !p.doliApiToken) throw new Error("Configuration Dolibarr introuvable.");

                    const apiUrl = p.doliUrl;
                    const token = p.doliApiToken;
                    const entity = p.doliEntity;
                    const oppOnly = p.doliOppOnly !== false;

                    const baseHeaders = {
                        'DOLAPIKEY': token,
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    };
                    if (entity && String(entity).trim() !== '') baseHeaders['DOLAPIENTITY'] = String(entity).trim();

                    const projectData = {
                        ref: 'auto',
                        title: subject,
                        description: message,
                        array_options: {}
                    };
                    if (tiersId && tiersId !== '') projectData.socid = parseInt(tiersId, 10);
                    if (oppOnly) projectData.usage_opportunity = 1;
                    if (proba) projectData.opp_percent = parseInt(proba, 10);
                    if (montant) projectData.opp_amount = parseFloat(montant);

                    // Mapping des extrafields (champs personnalisés Dolibarr)
                    if (nominee) projectData.array_options.options_reedcrm_lastname = nominee;
                    if (prenom) projectData.array_options.options_reedcrm_firstname = prenom;
                    if (tel) projectData.array_options.options_projectphone = tel;
                    if (email) projectData.array_options.options_reedcrm_email = email;
                    
                    if (websiteDomain) {
                        // Nettoyage sécurité : si l'utilisateur a collé l'url complète avec protocole (https://...) on l'enlève
                        websiteDomain = websiteDomain.replace(/^https?:\/\//i, '');
                        projectData.array_options.options_website = websiteProtocol + websiteDomain;
                    }

                    // Tentative d'injection native du contact à la création (comme pour les tickets)
                    const contactSelectElem = document.getElementById('ticket-contact');
                    const contactId = contactSelectElem ? contactSelectElem.value : '';
                    if (contactId && contactId !== '') {
                        projectData.contactid = parseInt(contactId, 10);
                        projectData.fk_contact = parseInt(contactId, 10);
                    }

                    const response = await fetchDoli(`${apiUrl}/projects`, {
                        method: 'POST',
                        headers: baseHeaders,
                        body: JSON.stringify(projectData)
                    });

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => null);
                        throw new DoliError('ReedCRM-4002', errorData);
                    }

                    const projResponseId = await response.json();
                    
                    btnSubmitOpp.querySelector('.btn-text span[data-i18n]').textContent = chrome.i18n.getMessage('popup_js_117');
                    
                    // Some Dolibarr versions/endpoints return an array [144] or a single int 144
                    const projectId = Array.isArray(projResponseId) ? projResponseId[0] : projResponseId;

                    // Ajout du contact sélectionné au projet (comme Contributeur)
                    let contactWasAssigned = true;
                    let contactErrorCode = null;
                    let contactErrorDetail = '';

                    if (contactId && contactId !== '') {
                        try {
                            const possibleCodes = [];
                            if (p && p.doliContactRole && String(p.doliContactRole).trim() !== '') {
                                possibleCodes.push(String(p.doliContactRole).trim());
                            }
                            possibleCodes.push("PROJECTCONTRIBUTOR", "PROJECTEXECUTIVE", "PROJECTCONTACT", "CUSTOMER");
                            
                            let linked = false;
                            let lastErrorMsg = '';

                            for (const code of possibleCodes) {
                                const contactRes = await fetchDoli(`${apiUrl}/projects/${projectId}/contacts`, {
                                    method: 'POST',
                                    headers: baseHeaders,
                                    body: JSON.stringify({
                                        contactid: parseInt(contactId, 10),
                                        fk_socpeople: parseInt(contactId, 10),
                                        type: code,
                                        type_contact: code,
                                        source: "external"
                                    })
                                });

                                if (contactRes.ok) {
                                    linked = true;
                                    break;
                                } else {
                                    const errJson = await contactRes.json().catch(() => null);
                                    lastErrorMsg = errJson?.error?.message || `HTTP ${contactRes.status}`;
                                }
                            }

                            if (!linked) {
                                // TENTATIVE DE SECOURS VIA L'INTERFACE GRAPHIQUE (Scraping)
                                // pour contourner un bug natif de Dolibarr v22+ (Route API dupliquée = Erreur 500 fatale)
                                try {
                                    let guiUrl = p.doliUrl;
                                    if (guiUrl.endsWith('/api/index.php')) {
                                        guiUrl = guiUrl.substring(0, guiUrl.length - '/api/index.php'.length);
                                    } else if (guiUrl.includes('/api/index.php/')) {
                                        guiUrl = guiUrl.split('/api/index.php/')[0];
                                    }

                                    const contactPageUrl = `${guiUrl}/projet/contact.php?id=${projectId}`;
                                    const pageRes = await fetch(contactPageUrl, { credentials: 'include' });
                                    const html = await pageRes.text();
                                    const tokenMatch = html.match(/name="token"\s+value="([^"]+)"/i);
                                    
                                    if (tokenMatch && tokenMatch[1]) {
                                        const csrfToken = tokenMatch[1];
                                        
                                        for (const code of possibleCodes) {
                                            const formData = new URLSearchParams();
                                            formData.append('token', csrfToken);
                                            formData.append('action', 'addcontact');
                                            formData.append('source', 'external');
                                            formData.append('contactid', contactId);
                                            formData.append('type', code);
                                            formData.append('id', projectId);

                                            const postRes = await fetch(contactPageUrl, {
                                                method: 'POST',
                                                body: formData,
                                                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                                                credentials: 'include'
                                            });

                                            if (postRes.ok) {
                                                const postHtml = await postRes.text();
                                                // Dolibarr affiche un div error si échec dans le GUI
                                                if (!postHtml.includes('class="error"')) {
                                                    linked = true;
                                                    break;
                                                }
                                            }
                                        }
                                    }
                                } catch (errFallback) {
                                    console.warn("Échec du contournement GUI :", errFallback);
                                }
                            }

                            if (!linked) {
                                contactWasAssigned = false;
                                contactErrorCode = 'ReedCRM-4001';
                                contactErrorDetail = lastErrorMsg;
                                
                                try {
                                    const versionRes = await fetchDoli(`${apiUrl}/status`, { headers: baseHeaders });
                                    if (versionRes.ok) {
                                        const statusData = await versionRes.json();
                                        window.doliVersionStr = statusData?.dolibarr?.version || statusData?.version || '22.0.x';
                                    } else {
                                        window.doliVersionStr = 'HTTP ' + versionRes.status;
                                    }
                                } catch(e) {
                                    console.warn("Erreur fetch /status:", e);
                                    window.doliVersionStr = "Illisible";
                                }
                            } else {
                                btnSubmitOpp.querySelector('.btn-text span[data-i18n]').textContent = chrome.i18n.getMessage('popup_js_118');
                                await new Promise(r => setTimeout(r, 600)); // Laisser l'utilisateur lire le message
                            }
                        } catch(e) {
                            console.warn("Impossible d'associer le contact à l'opportunité:", e);
                            contactWasAssigned = false;
                            contactErrorCode = 'ReedCRM-4003';
                            contactErrorDetail = e.message;
                            btnSubmitOpp.querySelector('.btn-text span[data-i18n]').textContent = chrome.i18n.getMessage('popup_js_119');
                            await new Promise(r => setTimeout(r, 600));
                        }
                    }

                    // Récupérer les détails du projet pour avoir la référence (PROJ...)
                    let projectRef = projectId;
                    try {
                        // Cherche le dernier projet créé (qui devrait être celui-ci) pour récupérer sa Ref propre
                        const refResponse = await fetchDoli(`${apiUrl}/projects?sortfield=t.rowid&sortorder=DESC&limit=1`, {
                            method: 'GET',
                            headers: baseHeaders
                        });
                        if (refResponse.ok) {
                            const prjList = await refResponse.json();
                            if (Array.isArray(prjList) && prjList.length > 0) {
                                // Double check if it matches our created ID just to be absolutely sure
                                if (prjList[0].id == projectId && prjList[0].ref) {
                                    projectRef = prjList[0].ref;
                                } else if (prjList[0].ref) {
                                    // Fallback to the latest one anyway
                                    projectRef = prjList[0].ref;
                                }
                            }
                        }
                    } catch (e) {
                        console.warn("Impossible de récupérer la référence de la nouvelle opportunité", e);
                    }

                    // Optionnel : si on veut ajouter un chef de projet, on le rajoute comme "contact interne" ?
                    // L'API projets est complexe. Par défaut on laisse vide ou on tenter d'utiliser fk_user_creat / affectation tierce.

                    // Pièce jointe
                    if (oppFilesList.length > 0 && projectId) {
                        btnSubmitOpp.querySelector('.btn-text span[data-i18n]').textContent = chrome.i18n.getMessage('popup_js_120');

                        for (let fileObj of oppFilesList) {
                            const fileToSend = fileObj.file;
                            const reader = new FileReader();
                            reader.readAsDataURL(fileToSend);

                            await new Promise((resolve, reject) => {
                                reader.onload = async () => {
                                    try {
                                        const base64Content = reader.result.split(',')[1];
                                        const documentData = {
                                            filecontent: base64Content,
                                            filename: fileToSend.name,
                                            fileencoding: "base64",
                                            modulepart: "project",
                                            ref: projectRef
                                        };

                                        const docResponse = await fetchDoli(`${apiUrl}/documents/upload`, {
                                            method: 'POST',
                                            headers: baseHeaders,
                                            body: JSON.stringify(documentData)
                                        });

                                        if (!docResponse.ok) {
                                            const docError = await docResponse.json().catch(() => null);
                                            let errorMsg = docError?.error?.message || ErrorManager.getMessage('ReedCRM-4002');
                                            throw new Error(`Opportunité créée, mais erreur PJ: ${errorMsg}`);
                                        }
                                        resolve();
                                    } catch (err) {
                                        reject(err);
                                    }
                                };
                                reader.onerror = () => reject(new Error("Erreur lecture fichier."));
                            });
                        }
                    }

                    const baseUrl = apiUrl.replace(/\/api\/index\.php\/?$/, '').replace(/\/htdocs\/api\/index\.php\/?$/, '/htdocs');
                    const projectLink = `${baseUrl}/projet/card.php?id=${projectId}`;

                    btnSubmitOpp.disabled = false;
                    btnSubmitOpp.classList.remove('btn-loading');
                    btnSubmitOpp.querySelector('.btn-text span[data-i18n]').textContent = chrome.i18n.getMessage('popup_js_121');
                    
                    let contactErrorHtml = '';
                    if (contactId && contactId !== '' && !contactWasAssigned) {
                        let errorMsg = ErrorManager.getMessage(contactErrorCode) || "Erreur inconnue";
                        
                        // Injection dynamique de la version
                        if (window.doliVersionStr && contactErrorCode === 'ReedCRM-4001') {
                            errorMsg = errorMsg.replace('[VERSION]', window.doliVersionStr);
                        } else {
                            // Nettoyage de sécurité si la version n'a pas pu être chargée
                            errorMsg = errorMsg.replace('[VERSION]', 'Inconnue');
                        }
                        
                        contactErrorHtml = `
                            <div style="color:#e74c3c; font-size:12px; margin-bottom: 6px; line-height: 1.4;">
                                <strong>${contactErrorCode}:</strong><br>
                                ${errorMsg}<br>
                                <small style="color:#c0392b;">Détail API: ${contactErrorDetail}</small>
                            </div>
                        `;
                    }
                    
                    oppStatusMessage.innerHTML = `
                        <div style="text-align:left;">
                            ${contactErrorHtml}
                            <div style="color:#27ae60; font-size:13px;">
                                Opportunité <a href="${projectLink}" target="_blank" style="text-decoration:none; font-weight:bold; color:#27ae60;" title="Voir le projet">${projectRef}</a> créée avec succès !
                            </div>
                        </div>
                    `;
                    oppForm.reset();
                    oppFilesList = []; renderThumbnails(oppFilesList, 'opp-preview-container', 'opp-file');
                    
                    // Nettoyage des brouillons après création réussie
                    const prId = p ? (p.id || 'default') : 'default';
                    chrome.storage.local.remove([`draftOpp_${prId}`, `draftShared_${prId}`]);

                    setTimeout(() => window.close(), 5000);

                } catch (error) {
                    btnSubmitOpp.classList.remove('btn-loading');
                    // We reset the text so error doesn't overwrite the button completely wrongly
                    btnSubmitOpp.querySelector('.btn-text span[data-i18n]').textContent = chrome.i18n.getMessage('popup_js_122');
                    btnSubmitOpp.disabled = false;
                    
                    showDoliError(error, oppStatusMessage);
                }
            });
        }

        // Gestion de l'envoi du formulaire TICKET
        ticketForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const subject = document.getElementById('ticket-subject').value;
            const message = document.getElementById('ticket-message').value;
            const fileInput = document.getElementById('ticket-file');
            const assigneeId = assigneeSelect.value;
            
            const tiersSelectElem = document.getElementById('ticket-tiers');
            const tiersId = tiersSelectElem ? tiersSelectElem.value : '';
            
            const contactSelectElem = document.getElementById('ticket-contact');
            const contactId = contactSelectElem ? contactSelectElem.value : '';

            const projectSelectElem = document.getElementById('ticket-project');
            const projectId = projectSelectElem ? projectSelectElem.value : '';

            btnSubmit.disabled = true;
            btnSubmit.classList.add('btn-loading');
            btnSubmit.querySelector('.btn-text span[data-i18n]').textContent = chrome.i18n.getMessage('popup_js_123');
            statusMessage.textContent = '';
            statusMessage.style.color = '#333';

            try {
                // Récupère les identifiants depuis le stockage Multi-Profile
                const items = await new Promise(resolve => chrome.storage.sync.get(['doliProfiles', 'doliActiveProfileId'], resolve));
                const profiles = items.doliProfiles || [];
                const p = profiles.find(prof => prof.id === items.doliActiveProfileId) || profiles[0];

                if (!p || !p.doliUrl || !p.doliApiToken) {
                    throw new DoliError("ReedCRM-2001");
                }

                const apiUrl = p.doliUrl;
                const token = p.doliApiToken;
                const entity = p.doliEntity;

                const baseHeaders = {
                    'DOLAPIKEY': token,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                };
                if (entity && String(entity).trim() !== '') {
                    baseHeaders['DOLAPIENTITY'] = String(entity).trim();
                }

                // 1. Création du Ticket (objet 'ticket' dans l'API Dolibarr)
                // Génération d'un track_id aléatoire car certaines versions de Dolibarr le rendent obligatoire silencieusement (erreur 500 sinon)
                const randomTrackId = 'TCK' + Math.random().toString(36).substr(2, 8).toUpperCase();

                const ticketData = {
                    subject: subject,
                    message: message,
                    track_id: randomTrackId,
                    type_code: p.doliTicketType || 'ISSUE', // Valeur par défaut "ISSUE"
                    severity_code: p.doliTicketSeverity || 'NORMAL' // Valeur par défaut "NORMAL"
                };

                // Ajout Tiers et Contact si renseignés
                if (tiersId && tiersId !== '') {
                    ticketData.socid = parseInt(tiersId, 10);
                    ticketData.fk_soc = parseInt(tiersId, 10); // Souvent l'un ou l'autre selon la version
                }
                if (contactId && contactId !== '') {
                    ticketData.contactid = parseInt(contactId, 10);
                    ticketData.fk_contact = parseInt(contactId, 10);
                }
                if (projectId && projectId !== '') {
                    ticketData.fk_project = parseInt(projectId, 10);
                }

                // Ajout de la catégorie (groupe) si configurée dans les options
                if (p.doliTicketCategory && p.doliTicketCategory.trim() !== '') {
                    ticketData.category_code = p.doliTicketCategory.trim();
                }

                // Ajout de l'utilisateur assigné si sélectionné
                if (assigneeId && assigneeId !== "") {
                    ticketData.fk_user_assign = parseInt(assigneeId, 10);
                }

                const response = await fetchDoli(`${apiUrl}/tickets`, {
                    method: 'POST',
                    headers: baseHeaders,
                    body: JSON.stringify(ticketData)
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    if (response.status === 401 || response.status === 403) {
                        throw new DoliError('ReedCRM-1003', errorText, { status: response.status });
                    }
                    if (response.status === 404) {
                        throw new DoliError('ReedCRM-1004', errorText, { status: response.status });
                    }
                    if (response.status === 500) {
                        throw new DoliError('ReedCRM-1500', errorText, { status: 500 });
                    }
                    throw new DoliError('ReedCRM-9999', `Erreur HTTP ${response.status}: ${errorText}`, { status: response.status });
                }

                const ticketId = await response.json(); // L'API POST /tickets retourne généralement l'ID du nouvel objet


                // 2. Gestion de la pièce jointe (si présente)
                let ticketRef = ticketId ? ticketId.toString() : '';

                if (ticketFilesList.length > 0 && ticketId) {
                    btnSubmit.querySelector('.btn-text span[data-i18n]').textContent = chrome.i18n.getMessage('popup_js_124');

                    // --- Récupération de la référence textuelle (ex: TCK2402-0001) ---
                    const getTicketRes = await fetchDoli(`${apiUrl}/tickets/${ticketId}`, {
                        headers: baseHeaders
                    });

                    if (getTicketRes.ok) {
                        const ticketDetails = await getTicketRes.json();
                        if (ticketDetails && ticketDetails.ref) {
                            ticketRef = ticketDetails.ref;
                        }
                    }

                    for (let fileObj of ticketFilesList) {
                        const fileToSend = fileObj.file;
                        // --- Lecture du fichier en base64 ---
                        const reader = new FileReader();
                        reader.readAsDataURL(fileToSend);

                        await new Promise((resolve, reject) => {
                            reader.onload = async () => {
                                try {
                                    const base64Content = reader.result.split(',')[1];

                                    const documentData = {
                                        filecontent: base64Content,
                                        filename: fileToSend.name,
                                        fileencoding: "base64",
                                        modulepart: "ticket",
                                        ref: ticketId.toString()
                                    };

                                    const docResponse = await fetchDoli(`${apiUrl}/documents/upload`, {
                                        method: 'POST',
                                        headers: baseHeaders,
                                        body: JSON.stringify(documentData)
                                    });

                                    if (!docResponse.ok) {
                                        const docError = await docResponse.json().catch(() => null);
                                        let errorMsg = ErrorManager.getMessage('ReedCRM-4004');
                                        if (docError && docError.error && docError.error.message) {
                                            errorMsg = docError.error.message;
                                            if (errorMsg.includes("Modulepart ticket not implemented yet")) {
                                                errorMsg = "Votre version de Dolibarr ne supporte pas encore l'envoi de fichiers vers les tickets via son API REST.";
                                            }
                                        }
                                        throw new DoliError('ReedCRM-9999', `Ticket créé (${ticketRef}), mais erreur PJ: ${errorMsg}`);
                                    }
                                    resolve();
                                } catch (err) {
                                    reject(err);
                                }
                            };
                            reader.onerror = () => reject(new DoliError('ReedCRM-9999', `Ticket créé (${ticketRef}), mais erreur de lecture du fichier`));
                        });
                    }
                } else if (ticketId) {
                    // Si pas de fichier, on récupère quand même la ref pour l'affichage
                    const getTicketRes = await fetchDoli(`${apiUrl}/tickets/${ticketId}`, {
                        headers: baseHeaders
                    });
                    if (getTicketRes.ok) {
                        const ticketDetails = await getTicketRes.json();
                        if (ticketDetails && ticketDetails.ref) {
                            ticketRef = ticketDetails.ref;
                        }
                    }
                }

                // Génération du lien vers l'interface web Dolibarr
                // On retire la partie "/api/index.php" (ou sa variante) de l'URL pour pointer vers la racine web
                const baseUrl = apiUrl.replace(/\/api\/index\.php\/?$/, '').replace(/\/htdocs\/api\/index\.php\/?$/, '/htdocs');
                const ticketLink = `${baseUrl}/ticket/card.php?id=${ticketId}`;
                const displayRef = ticketRef || ticketId;

                // Succès final (On injecte du HTML ici pour avoir un lien cliquable)
                btnSubmit.classList.remove('btn-loading');
                btnSubmit.querySelector('.btn-text span[data-i18n]').textContent = chrome.i18n.getMessage('popup_js_125');
                statusMessage.innerHTML = `
                    <div style="color:#27ae60; font-size:13px; text-align:left;">
                        Ticket <a href="${ticketLink}" target="_blank" style="text-decoration:none; font-weight:bold; color:#27ae60;" title="Voir le ticket">${displayRef}</a> créé avec succès !
                    </div>
                `;
                ticketForm.reset();
                ticketFilesList = []; renderThumbnails(ticketFilesList, 'preview-container', 'ticket-file');
                
                // Nettoyage des brouillons après création réussie
                const prfId = p ? (p.id || 'default') : 'default';
                chrome.storage.local.remove([`draftTicket_${prfId}`, `draftShared_${prfId}`]);

            } catch (error) {
                btnSubmit.classList.remove('btn-loading');
                btnSubmit.querySelector('.btn-text span[data-i18n]').textContent = chrome.i18n.getMessage('popup_js_126');
                btnSubmit.disabled = false;

                // Si l'erreur signale que le ticket a quand même été créé (ex: échec d'upload)
                if (error.message && error.message.includes('Ticket créé')) {
                    statusMessage.style.color = '#e74c3c';
                    const items = await new Promise(resolve => chrome.storage.local.get(['doliUrl'], resolve));
                    const baseUrl = items.doliUrl ? items.doliUrl.replace(/\/api\/index\.php\/?$/, '').replace(/\/htdocs\/api\/index\.php\/?$/, '/htdocs') : '#';
                    const match = error.message.match(/Ticket créé \((.*?)\)/);
                    const extractedRef = match ? match[1] : '';
                    let detailsMsg = error.message.split('pièce jointe échouée:');
                    detailsMsg = detailsMsg.length > 1 ? detailsMsg[1].trim() : 'Erreur inconnue de la PJ';

                    statusMessage.innerHTML = `
                        <div style="font-size:13px; text-align:left;">
                            <span style="color:#e67e22; font-weight:bold;">⚠️ Créé partiellement :</span>
                            Le <a href="${baseUrl}/ticket/card.php?id=${extractedRef}" target="_blank" style="text-decoration:none; font-weight:bold; color:#e67e22;">Ticket ${extractedRef}</a> a été enregistré, mais la pièce jointe n'a pas pu être envoyée.
                            <br><small style="color:#e74c3c;"><i>Détail : ${detailsMsg}</i></small>
                        </div>
                    `;
                } else {
                    showDoliError(error, statusMessage);
                }
                btnSubmit.querySelector('.btn-text span[data-i18n]').textContent = chrome.i18n.getMessage('popup_js_127');
            }
        });

        // --- Gestion du collage d'image (Presse-papier) ---
        let ticketFilesList = [];
        let oppFilesList = [];

        function renderThumbnails(filesArray, containerId, inputId) {
            const container = document.getElementById(containerId);
            const input = document.getElementById(inputId);
            
            if (filesArray.length === 0) {
                container.classList.add('hidden');
                container.innerHTML = '';
                if (input) input.value = '';
                return;
            }
            
            container.classList.remove('hidden');
            container.innerHTML = '';
            container.classList.add('new-layout');
            
            filesArray.forEach((fileObj, index) => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'preview-item rich-thumb';
                
                let ext = fileObj.file.name.split('.').pop().toLowerCase();
                let iconSvg = '';
                let extBadge = ext;
                let iconClass = '';

                if (fileObj.file.type.startsWith('image/')) {
                    iconSvg = `<img src="${fileObj.previewUrl}" style="width:100%; height:100%; object-fit:cover; border-radius:4px;">`;
                    iconClass = 'is-image';
                    if (ext === 'jpeg') extBadge = 'jpg';
                } else if (ext === 'pdf') {
                    iconSvg = '<svg viewBox="0 0 512 512" fill="currentColor"><path d="M0 64C0 28.7 28.7 0 64 0L224 0l0 128c0 17.7 14.3 32 32 32l128 0 0 144-208 0c-35.3 0-64 28.7-64 64l0 144-48 0c-35.3 0-64-28.7-64-64L0 64zm384 64l-128 0L256 0 384 128zM176 352l32 0c30.9 0 56 25.1 56 56s-25.1 56-56 56l-16 0 0 32c0 8.8-7.2 16-16 16s-16-7.2-16-16l0-48 0-80c0-8.8 7.2-16 16-16zm32 80c13.3 0 24-10.7 24-24s-10.7-24-24-24l-16 0 0 48 16 0zm96-80l32 0c26.5 0 48 21.5 48 48l0 64c0 26.5-21.5 48-48 48l-32 0c-8.8 0-16-7.2-16-16l0-128c0-8.8 7.2-16 16-16zm32 128c8.8 0 16-7.2 16-16l0-64c0-8.8-7.2-16-16-16l-16 0 0 96 16 0zm80-112c0-8.8 7.2-16 16-16l48 0c8.8 0 16 7.2 16 16s-7.2 16-16 16l-32 0 0 32 32 0c8.8 0 16 7.2 16 16s-7.2 16-16 16l-32 0 0 48c0 8.8-7.2 16-16 16s-16-7.2-16-16l0-64 0-64z"/></svg>';
                    iconClass = 'is-pdf';
                } else if (['doc', 'docx'].includes(ext)) {
                    iconSvg = '<svg viewBox="0 0 384 512" fill="currentColor"><path d="M64 0C28.7 0 0 28.7 0 64L0 448c0 35.3 28.7 64 64 64l256 0c35.3 0 64-28.7 64-64l0-288-128 0c-17.7 0-32-14.3-32-32L224 0 64 0zM256 0l0 128 128 0L256 0zM111 257.1l26.8 89.2 31.6-90.3c3.4-9.6 12.5-16.1 22.7-16.1s19.3 6.4 22.7 16.1l31.6 90.3L273 257.1c3.8-12.7 17.2-19.9 29.9-16.1s19.9 17.2 16.1 29.9l-48 160c-3 10-12 16.9-22.4 17.1s-19.8-6.2-23.2-16.1L192 336.6l-33.3 95.3c-3.4 9.8-12.8 16.3-23.2 16.1s-19.5-7.1-22.4-17.1l-48-160c-3.8-12.7 3.4-26.1 16.1-29.9s26.1 3.4 29.9 16.1z"/></svg>';
                    iconClass = 'is-word';
                } else {
                    iconSvg = '<svg viewBox="0 0 384 512" fill="currentColor"><path d="M64 0C28.7 0 0 28.7 0 64L0 448c0 35.3 28.7 64 64 64l256 0c35.3 0 64-28.7 64-64l0-288-128 0c-17.7 0-32-14.3-32-32L224 0 64 0zM256 0l0 128 128 0L256 0zM112 256l160 0c8.8 0 16 7.2 16 16s-7.2 16-16 16l-160 0c-8.8 0-16-7.2-16-16s7.2-16 16-16zm0 64l160 0c8.8 0 16 7.2 16 16s-7.2 16-16 16l-160 0c-8.8 0-16-7.2-16-16s7.2-16 16-16zm0 64l160 0c8.8 0 16 7.2 16 16s-7.2 16-16 16l-160 0c-8.8 0-16-7.2-16-16s7.2-16 16-16z"/></svg>';
                    extBadge = ext.substring(0, 4);
                }

                // Safe DOM construction to prevent XSS from file names
                const badgeDiv = document.createElement('div');
                badgeDiv.className = 'thumb-badge';
                badgeDiv.textContent = extBadge;

                const iconDiv = document.createElement('div');
                iconDiv.className = `thumb-icon ${iconClass}`;
                iconDiv.innerHTML = iconSvg; // Safe: generated internally, not from user input

                const nameDiv = document.createElement('div');
                nameDiv.className = 'thumb-name';
                nameDiv.title = fileObj.file.name;
                nameDiv.textContent = fileObj.file.name; // Safe against XSS

                itemDiv.appendChild(badgeDiv);
                itemDiv.appendChild(iconDiv);
                itemDiv.appendChild(nameDiv);

                const removeBtn = document.createElement('button');
                removeBtn.className = 'btn-remove-item rich-close';
                removeBtn.innerHTML = '<svg viewBox="0 0 512 512" fill="currentColor"><path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM175 175c9.4-9.4 24.6-9.4 33.9 0l47 47 47-47c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9l-47 47 47 47c9.4 9.4 9.4 24.6 0 33.9s-24.6 9.4-33.9 0l-47-47-47 47c-9.4 9.4-24.6 9.4-33.9 0s-9.4-24.6 0-33.9l47-47-47-47c-9.4-9.4-9.4-24.6 0-33.9z"/></svg>';
                removeBtn.title = "Supprimer";
                removeBtn.onclick = (e) => {
                    e.preventDefault();
                    filesArray.splice(index, 1);
                    renderThumbnails(filesArray, containerId, inputId);
                };
                itemDiv.appendChild(removeBtn);
                
                container.appendChild(itemDiv);
            });
        }

        const fileInput = document.getElementById('ticket-file');
        const oppFileInput = document.getElementById('opp-file');

        document.addEventListener('paste', (e) => {
            if (e.target.tagName === 'INPUT' && e.target.type === 'text' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            const items = (e.clipboardData || e.originalEvent.clipboardData).items;
            for (let index in items) {
                const item = items[index];
                if (item.kind === 'file') {
                    const blob = item.getAsFile();
                    if (blob && blob.type.startsWith('image/')) {
                        const date = new Date().toISOString().replace(/T/, '_').replace(/:/g, '-').split('.')[0];
                        const newFile = new File([blob], `Capture_${date}.png`, { type: blob.type });
                        const fileObj = { file: newFile, previewUrl: URL.createObjectURL(blob) };

                        if (tabOpportunite.classList.contains('active')) {
                            oppFilesList.push(fileObj);
                            renderThumbnails(oppFilesList, 'opp-preview-container', 'opp-file');
                        } else {
                            ticketFilesList.push(fileObj);
                            renderThumbnails(ticketFilesList, 'preview-container', 'ticket-file');
                        }
                        e.preventDefault();
                    }
                }
            }
        });

        if (fileInput) {
            fileInput.addEventListener('change', () => {
                Array.from(fileInput.files).forEach(f => {
                    const previewUrl = f.type.startsWith('image/') ? URL.createObjectURL(f) : '';
                    ticketFilesList.push({ file: f, previewUrl });
                });
                renderThumbnails(ticketFilesList, 'preview-container', 'ticket-file');
            });
        }

        if (oppFileInput) {
            oppFileInput.addEventListener('change', () => {
                Array.from(oppFileInput.files).forEach(f => {
                    const previewUrl = f.type.startsWith('image/') ? URL.createObjectURL(f) : '';
                    oppFilesList.push({ file: f, previewUrl });
                });
                renderThumbnails(oppFilesList, 'opp-preview-container', 'opp-file');
            });
        }

        // --- Gestion du bouton "Capturer l'écran" ---
        const btnCaptureScreen = document.getElementById('btn-capture-screen');
        const oppBtnCaptureScreen = document.getElementById('opp-btn-capture-screen');

        const triggerCapture = async (btnElement, statusElementId) => {
            try {
                btnElement.textContent = chrome.i18n.getMessage('popup_js_128');
                btnElement.disabled = true;
                const statusMessage = document.getElementById(statusElementId);
                if (statusMessage) { statusMessage.textContent = ""; }

                // --- Sauvegarde des champs du formulaire avant fermeture du popup ---
                const isOppActive = tabOpportunite.classList.contains('active');
                let storageData = {
                    doliPrefillSubject: document.getElementById(isOppActive ? 'opp-subject' : 'ticket-subject').value || '',
                    doliPrefillMessage: document.getElementById(isOppActive ? 'opp-message' : 'ticket-message').value || '',
                    doliPrefillAssignee: isOppActive ? (oppAssigneeSelect ? oppAssigneeSelect.value : '') : (assigneeSelect ? assigneeSelect.value : ''),
                    doliActiveTab: isOppActive ? 'opportunite' : 'ticket'
                };

                if (isOppActive) {
                    storageData.doliPrefillOppNom = document.getElementById('opp-nom').value || '';
                    storageData.doliPrefillOppPrenom = document.getElementById('opp-prenom').value || '';
                    storageData.doliPrefillOppTel = document.getElementById('opp-tel').value || '';
                    storageData.doliPrefillOppEmail = document.getElementById('opp-email').value || '';
                    storageData.doliPrefillOppProba = document.getElementById('opp-proba').value || '50';
                    storageData.doliPrefillOppMontant = document.getElementById('opp-montant').value || '';
                }

                // Sauvegarde globale des 3 listes déroulantes (valable pour Ticket et Opp)
                const tiersElem = document.getElementById('ticket-tiers');
                const contactElem = document.getElementById('ticket-contact');
                const projectElem = document.getElementById('ticket-project');
                if (tiersElem) storageData.doliPrefillTicketTiers = tiersElem.value || '';
                if (contactElem) storageData.doliPrefillTicketContact = contactElem.value || '';
                if (projectElem) storageData.doliPrefillTicketProject = projectElem.value || '';

                // Sauvegarde des fichiers en cours
                const serializeFiles = async (filesArray) => {
                    return Promise.all(filesArray.map(async fileObj => {
                        return new Promise(resolve => {
                            const reader = new FileReader();
                            reader.onload = () => resolve({
                                name: fileObj.file.name,
                                type: fileObj.file.type,
                                data: reader.result
                            });
                            reader.readAsDataURL(fileObj.file);
                        });
                    }));
                };

                storageData.doliPendingTicketFiles = await serializeFiles(ticketFilesList);
                storageData.doliPendingOppFiles = await serializeFiles(oppFilesList);

                chrome.storage.local.set(storageData);

                // 1. Déclencher la capture
                chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
                    if (chrome.runtime.lastError || !dataUrl) {
                        const err = chrome.runtime.lastError ? chrome.runtime.lastError.message : "Pas d'image";
                        if (statusMessage) {
                            statusMessage.textContent = chrome.i18n.getMessage('popup_js_129') + err;
                            statusMessage.style.color = "#e74c3c";
                        }
                        resetCaptureButton(btnElement);
                        return;
                    }

                    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                        if (!tabs || tabs.length === 0) {
                            if (statusMessage) {
                                statusMessage.textContent = chrome.i18n.getMessage('popup_js_130');
                                statusMessage.style.color = "#e74c3c";
                            }
                            resetCaptureButton(btnElement);
                            return;
                        }

                        let promises = tabs.map(tab => {
                            return new Promise(resolve => {
                                // Vérifier directement si l'URL est interdite par Chrome
                                if (tab.url && (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('edge://') || tab.url.startsWith('https://chrome.google.com/webstore'))) {
                                    resolve({ success: false, error: "FORBIDDEN_URL" });
                                    return;
                                }

                                const trySendMessage = (retryCount = 0) => {
                                    chrome.tabs.sendMessage(tab.id, {
                                        action: "START_IN_PAGE_EDITOR",
                                        image: dataUrl
                                    }, (response) => {
                                        if (chrome.runtime.lastError) {
                                            const errMessage = chrome.runtime.lastError.message;
                                            
                                            // Si le content script n'est pas trouvé (Ex: extension rechargée ou page ouverte avant installation)
                                            if (retryCount === 0 && errMessage.includes("Receiving end does not exist") && chrome.scripting) {
                                                // Injection dynamique pour éviter à l'utilisateur de faire F5
                                                chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: ["src/content/content.css"] }, () => {
                                                    chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["src/content/content.js"] }, () => {
                                                        // Laisser 250ms au content script pour écouter les messages
                                                        setTimeout(() => trySendMessage(1), 250);
                                                    });
                                                });
                                                return; // On attend la fin de l'injection
                                            }
                                            resolve({ success: false, error: errMessage });
                                        }
                                        else resolve({ success: true });
                                    });
                                };
                                
                                trySendMessage(0);
                            });
                        });

                        const timeout = new Promise(resolve => setTimeout(() => resolve([{ success: false, timeout: true }]), 4000));

                        Promise.race([Promise.all(promises), timeout]).then((results) => {
                            let failed = false;
                            let isTimeout = false;
                            let specificError = "";

                            for (let res of results) {
                                if (!res.success) {
                                    failed = true;
                                    if (res.timeout) isTimeout = true;
                                    if (res.error) specificError = res.error;
                                }
                            }

                            if (failed) {
                                if (statusMessage) {
                                    let errorKey = 'error_5099';
                                    if (isTimeout) {
                                        errorKey = 'error_5001';
                                    } else if (specificError === "FORBIDDEN_URL") {
                                        errorKey = 'error_5002';
                                    } else if (specificError.includes("Receiving end does not exist")) {
                                        errorKey = 'error_5003';
                                    }

                                    statusMessage.textContent = ErrorManager.getMessage(errorKey, specificError);
                                    statusMessage.style.color = "#e74c3c";
                                }
                                resetCaptureButton(btnElement);
                            } else {
                                window.close();
                            }
                        });
                    });
                });
            } catch (e) {
                console.error("CRITICAL ERROR CAPTURE:", e);
                const statusMessage = document.getElementById(statusElementId);
                if (statusMessage) {
                    statusMessage.textContent = chrome.i18n.getMessage('popup_js_131') + e.message;
                    statusMessage.style.color = "#e74c3c";
                }
                btnElement.disabled = false;
                btnElement.textContent = chrome.i18n.getMessage('popup_js_132');
            }
        };

        function resetCaptureButton(btn) {
            btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px; vertical-align: text-bottom;"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg> Capturer';
            btn.disabled = false;
        }

        if (btnCaptureScreen) btnCaptureScreen.addEventListener('click', () => triggerCapture(btnCaptureScreen, 'status-message'));
        if (oppBtnCaptureScreen) oppBtnCaptureScreen.addEventListener('click', () => triggerCapture(oppBtnCaptureScreen, 'opp-status-message'));

        // --- Chargement automatique d'une capture en attente (depuis l'éditeur in-page) ---
        chrome.storage.local.get(['doliPendingScreenshot', 'doliActiveTab', 'doliPendingTicketFiles', 'doliPendingOppFiles'], (result) => {
            
            // Restauration des fichiers précédents
            const restoreFiles = (serializedArray, targetList, containerId, inputId) => {
                if (serializedArray && serializedArray.length > 0) {
                    serializedArray.forEach(f => {
                        fetch(f.data).then(r => r.blob()).then(blob => {
                            const newFile = new File([blob], f.name, { type: f.type });
                            targetList.push({ file: newFile, previewUrl: URL.createObjectURL(blob) });
                            renderThumbnails(targetList, containerId, inputId);
                        });
                    });
                }
            };

            restoreFiles(result.doliPendingTicketFiles, ticketFilesList, 'preview-container', 'ticket-file');
            restoreFiles(result.doliPendingOppFiles, oppFilesList, 'opp-preview-container', 'opp-file');
            
            // Nettoyage pour ne pas les garder indéfiniment
            chrome.storage.local.remove(['doliPendingTicketFiles', 'doliPendingOppFiles']);


            if (result.doliPendingScreenshot) {
                const dataUrl = result.doliPendingScreenshot;
                const activeTabScreenshot = result.doliActiveTab || 'ticket';

                // Retirer de la mémoire pour ne pas recharger indéfiniment
                chrome.storage.local.remove(['doliPendingScreenshot']);

                fetch(dataUrl)
                    .then(res => res.blob())
                    .then(blob => {
                        const date = new Date().toISOString().replace(/T/, '_').replace(/:/g, '-').split('.')[0];
                        const extension = dataUrl.startsWith('data:image/jpeg') ? 'jpg' : 'png';
                        const mimeType = dataUrl.startsWith('data:image/jpeg') ? 'image/jpeg' : 'image/png';
                        const newFile = new File([blob], `Annotation_${date}.${extension}`, { type: mimeType });
                        const fileObj = { file: newFile, previewUrl: URL.createObjectURL(blob) };

                        if (activeTabScreenshot === 'opportunite') {
                            oppFilesList.push(fileObj);
                            renderThumbnails(oppFilesList, 'opp-preview-container', 'opp-file');
                        } else {
                            ticketFilesList.push(fileObj);
                            renderThumbnails(ticketFilesList, 'preview-container', 'ticket-file');
                        }
                    });
            }
        });

        const btnClearTicket = document.getElementById('btn-clear-ticket');
        if (btnClearTicket) {
            btnClearTicket.addEventListener('click', () => {
                document.getElementById('ticket-form').reset();
                document.getElementById('ticket-subject').focus();
                // Forcer la sauvegarde d'un brouillon vide (ou la suppression)
                const pId = document.getElementById('doli-active-profile').value;
                if (pId) chrome.storage.local.remove([`draftTicket_${pId}`, `draftShared_${pId}`]);
            });
        }

        const oppBtnClear = document.getElementById('opp-btn-clear');
        if (oppBtnClear) {
            oppBtnClear.addEventListener('click', () => {
                document.getElementById('opp-form').reset();
                document.getElementById('opp-subject').focus();
                const pId = document.getElementById('doli-active-profile').value;
                if (pId) chrome.storage.local.remove([`draftOpp_${pId}`, `draftShared_${pId}`]);
            });
        }

        // Recherche dans les opportunités
        const oppSearchInput = document.getElementById('opp-search-input');
        let currentOppDateFilter = 'month';
        
        function applyOppFilters() {
            const query = (oppSearchInput ? oppSearchInput.value : '').toLowerCase().trim();
            const items = document.querySelectorAll('.opp-list-item');
            
            if (query.length > 0 && query.length < 3) {
                return; // Attente d'au moins 3 caractères
            }

            const now = Date.now() / 1000;
            const ONE_DAY = 24 * 3600;
            const ONE_WEEK = 7 * ONE_DAY;
            const ONE_MONTH = 30 * ONE_DAY;

            let visibleCount = 0;

            items.forEach(item => {
                let matchSearch = true;
                if (query !== '') {
                    const searchStr = item.getAttribute('data-search') || '';
                    const searchTokens = query.split(' ').filter(t => t.length > 0);
                    matchSearch = searchTokens.every(token => searchStr.includes(token));
                }

                let matchDate = true;
                if (currentOppDateFilter) {
                    const itemDate = parseFloat(item.getAttribute('data-date')) || 0;
                    if (currentOppDateFilter === 'yesterday') {
                        // Moins de 48h (approximation de "hier")
                        matchDate = (now - itemDate) <= (2 * ONE_DAY); 
                    } else if (currentOppDateFilter === 'week') {
                        matchDate = (now - itemDate) <= ONE_WEEK;
                    } else if (currentOppDateFilter === 'month') {
                        matchDate = (now - itemDate) <= ONE_MONTH;
                    }
                }

                if (matchSearch && matchDate) {
                    item.style.display = 'flex';
                    visibleCount++;
                } else {
                    item.style.display = 'none';
                }
            });

            if (query === '') {
                items.forEach(item => {
                        if (item.classList.contains('initially-hidden')) {
                            item.style.display = 'none';
                        }
                    });
            }
        }

        if (oppSearchInput) {
            let debounceTimer;
            oppSearchInput.addEventListener('input', () => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    applyOppFilters();
                }, 300);
            });
        }

        const quickFilters = document.querySelectorAll('.opp-quick-filter');
        quickFilters.forEach(btn => {
            if (btn.getAttribute('data-filter') === 'month') {
                btn.classList.add('active');
            }
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const filter = e.currentTarget.getAttribute('data-filter');
                if (filter === 'all') {
                    currentOppDateFilter = null;
                } else {
                    currentOppDateFilter = filter;
                }
                
                quickFilters.forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');

                applyOppFilters();
            });
        });

    } catch (fatalError) {
        document.body.innerHTML = `<div style="padding: 20px; color: red; font-family: sans-serif;">
            <h3 style="margin-top:0;">Erreur fatale de l'extension</h3>
            <p>${fatalError.message}</p>
            <pre style="font-size:10px; overflow:auto; background:#eee; padding:5px;">${fatalError.stack}</pre>
        </div>`;
    }
});

document.addEventListener('dblclick', (e) => {
    if (e.target.classList.contains('copy-able')) {
        const textToCopy = e.target.getAttribute('data-copy');
        if (textToCopy) {
            navigator.clipboard.writeText(textToCopy).then(() => {
                const originalText = e.target.textContent;
                e.target.textContent = chrome.i18n.getMessage('popup_js_133');
                e.target.style.color = '#27ae60';
                e.target.style.fontWeight = 'bold';
                setTimeout(() => {
                    e.target.textContent = originalText;
                    e.target.style.color = '';
                    e.target.style.fontWeight = '';
                }, 1000);
            });
            window.getSelection().removeAllRanges();
        }
    }
});


document.addEventListener('click', async (e) => {
    const copyIcon = e.target.closest('.copy-icon');
    if (copyIcon) {
        e.preventDefault();
        e.stopPropagation();
        const text = copyIcon.getAttribute('data-copy');
        if (text) {
            try {
                await navigator.clipboard.writeText(text);
                const origColor = copyIcon.style.color;
                copyIcon.style.color = '#10b981'; // Green
                setTimeout(() => { copyIcon.style.color = origColor; }, 1000);
            } catch (err) {}
        }
        return;
    }

    const editable = e.target.closest('.inline-editable');
    if (editable) {
        e.preventDefault();
        e.stopPropagation();
        
        if (editable.querySelector('input')) return;
        
        const currentValue = editable.getAttribute('data-val') || '';
        const projectId = editable.getAttribute('data-pid');
        const fieldName = editable.getAttribute('data-field');
        
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'inline-edit-input';
        input.value = currentValue;
        
        const originalHtml = editable.innerHTML;
        const originalClass = editable.className;
        
        editable.innerHTML = '';
        editable.appendChild(input);
        input.focus();
        input.select();
        
        let isSaving = false;
        
        const saveEdit = async () => {
            if (isSaving) return;
            isSaving = true;
            
            let newValue = input.value.trim();
            
            const showErrorInline = (msg) => {
                editable.style.transition = 'color 0.3s ease';
                editable.style.color = '#ef4444'; // Rouge vif
                editable.innerHTML = msg;
                setTimeout(() => {
                    editable.style.color = '';
                    editable.style.transition = '';
                    editable.innerHTML = originalHtml;
                    editable.className = originalClass;
                    // On ne remet pas isSaving à false car on a restauré l'état initial (plus d'input)
                }, 3000);
            };

            if (fieldName === 'options_projectphone' && newValue !== '') {
                if (/[a-zA-Z]/.test(newValue)) {
                    showErrorInline(chrome.i18n.getMessage('popup_title_42') || "Veuillez saisir un numéro valide");
                    return;
                }
                
                // Suppression de tout ce qui n'est pas chiffre ou '+'
                newValue = newValue.replace(/[^\d+]/g, '');
                
                if (newValue.length > 0 && (newValue.length < 9 || newValue.length > 15)) {
                    showErrorInline(chrome.i18n.getMessage('popup_title_42') || "Veuillez saisir un numéro valide");
                    return;
                }
                
                // Formatage français basique (0X XX XX XX XX) si 10 chiffres commençant par 0
                if (/^0[1-9]\d{8}$/.test(newValue)) {
                    newValue = newValue.replace(/(\d{2})(?=\d)/g, '$1 ');
                }
            }
            
            if (fieldName === 'options_reedcrm_email' && newValue !== '') {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(newValue)) {
                    showErrorInline(chrome.i18n.getMessage('popup_js_err_email') || "Email invalide");
                    return;
                }
            }
            
            if (fieldName === 'options_reedcrm_website' && newValue !== '') {
                const websiteRegex = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/i;
                if (!websiteRegex.test(newValue)) {
                    showErrorInline(chrome.i18n.getMessage('popup_title_43') || "Exemple de domaine valide: monsite.com");
                    return;
                }
                if (!newValue.startsWith('http://') && !newValue.startsWith('https://')) {
                    newValue = 'https://' + newValue;
                }
            }
            
            if (fieldName === 'opp_percent' && newValue !== '') {
                if (/[^\d.,]/.test(newValue)) {
                    showErrorInline(chrome.i18n.getMessage('popup_js_err_percent') || "Le pourcentage doit être entre 0 et 100");
                    return;
                }
                newValue = newValue.replace(',', '.');
                const percentVal = parseFloat(newValue);
                if (isNaN(percentVal) || percentVal < 0 || percentVal > 100) {
                    showErrorInline(chrome.i18n.getMessage('popup_js_err_percent') || "Le pourcentage doit être entre 0 et 100");
                    return;
                }
                newValue = percentVal.toString();
            }
            
            if (fieldName === 'opp_amount' && newValue !== '') {
                if (/[^\d.,\s]/.test(newValue)) {
                    showErrorInline(chrome.i18n.getMessage('popup_js_err_amount') || "Montant invalide (chiffres uniquement)");
                    return;
                }
                newValue = newValue.replace(/\s/g, '').replace(',', '.');
                const amountVal = parseFloat(newValue);
                if (isNaN(amountVal) || amountVal < 0) {
                    showErrorInline(chrome.i18n.getMessage('popup_js_err_amount') || "Montant invalide (chiffres uniquement)");
                    return;
                }
                newValue = amountVal.toString();
            }
            
            if (newValue === currentValue) {
                editable.innerHTML = originalHtml;
                editable.className = originalClass;
                return;
            }
            
            input.disabled = true;
            input.style.opacity = '0.5';
            
            try {
                const profiles = await new Promise(resolve => chrome.storage.sync.get('doliProfiles', data => resolve(data.doliProfiles || [])));
                let activeProfileId = null;
                await new Promise(resolve => chrome.storage.sync.get('doliActiveProfileId', data => { activeProfileId = data.doliActiveProfileId; resolve(); }));
                
                const profile = activeProfileId ? profiles.find(p => p.id === activeProfileId) : profiles[0];
                if (!profile) throw new Error("No profile found");
                
                const apiUrl = profile.doliUrl;
                const token = profile.doliApiToken;
                
                let payload = {};
                if (fieldName.startsWith('options_')) {
                    payload = {
                        array_options: {
                            [fieldName]: newValue
                        }
                    };
                } else {
                    payload = {
                        [fieldName]: newValue
                    };
                }
                
                const res = await fetchDoli(`${apiUrl}/projects/${projectId}`, {
                    method: 'PUT',
                    headers: {
                        'DOLAPIKEY': token,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });
                
                if (res.ok) {
                    editable.setAttribute('data-val', newValue);
                    let displayValue = newValue;
                    if (!newValue) {
                        editable.classList.add('placeholder-text');
                        if (fieldName === 'options_reedcrm_firstname') displayValue = 'Prénom';
                        else if (fieldName === 'options_reedcrm_lastname') displayValue = 'Nom';
                        else if (fieldName === 'options_projectphone') displayValue = '0102030405';
                        else if (fieldName === 'options_reedcrm_email') displayValue = 'nomail@nomail.com';
                        else if (fieldName === 'options_reedcrm_website') displayValue = 'https://www.website.com';
                        else if (fieldName === 'opp_percent') displayValue = '0 %';
                        else if (fieldName === 'opp_amount') displayValue = '0 €';
                    } else {
                        editable.classList.remove('placeholder-text');
                        if (fieldName === 'opp_percent') {
                            displayValue = `${Math.round(parseFloat(newValue))} %`;
                        } else if (fieldName === 'opp_amount') {
                            displayValue = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(parseFloat(newValue));
                        } else if (fieldName === 'options_reedcrm_website') {
                            displayValue = newValue;
                        }
                    }
                    editable.innerHTML = displayValue;
                    
                    const contactLine = editable.closest('.rt-contact-line');
                    if (contactLine) {
                        let targetBtn = null;
                        if (fieldName === 'options_projectphone') targetBtn = contactLine.querySelector('[data-copy-target="tel"]');
                        if (fieldName === 'options_reedcrm_email') targetBtn = contactLine.querySelector('[data-copy-target="email"]');
                        if (targetBtn) targetBtn.setAttribute('data-copy', newValue);
                        
                        if (fieldName === 'options_reedcrm_website') {
                            const linkEl = contactLine.querySelector('.rt-contact-link');
                            if (newValue) {
                                const href = newValue.startsWith('http') ? newValue : 'https://' + newValue;
                                if (linkEl) {
                                    linkEl.href = href;
                                } else {
                                    const newLink = document.createElement('a');
                                    newLink.href = href;
                                    newLink.target = "_blank";
                                    newLink.className = "rt-contact-link";
                                    newLink.style.marginLeft = "2px";
                                    newLink.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>`;
                                    editable.parentNode.insertBefore(newLink, editable.nextSibling);
                                }
                            } else {
                                if (linkEl) linkEl.remove();
                            }
                        }
                    }
                    
                    // Animation : passage au vert puis retour à la normale
                    editable.style.transition = 'color 0.5s ease-out';
                    editable.style.color = '#10b981';
                    setTimeout(() => {
                        editable.style.color = '';
                        setTimeout(() => {
                            editable.style.transition = '';
                        }, 500);
                    }, 1000);
                } else {
                    let errStr = "API error";
                    try {
                        const errJson = await res.json();
                        errStr = errJson.error ? (errJson.error.message || JSON.stringify(errJson.error)) : JSON.stringify(errJson);
                    } catch(e) {
                        errStr = e.message || "API error";
                    }
                    throw new Error(errStr);
                }
            } catch (err) {
                console.error(err);
                alert(chrome.i18n.getMessage('popup_js_err_save') + err.message);
                editable.innerHTML = originalHtml;
                editable.className = originalClass;
            }
        };
        
        input.addEventListener('blur', saveEdit);
        input.addEventListener('keydown', (evt) => {
            if (evt.key === 'Enter') {
                saveEdit();
            } else if (evt.key === 'Tab') {
                evt.preventDefault();
                saveEdit().then(() => {
                    const allEditables = Array.from(document.querySelectorAll('.inline-editable'));
                    const currentIndex = allEditables.indexOf(editable);
                    if (currentIndex > -1 && currentIndex < allEditables.length - 1) {
                        allEditables[currentIndex + 1].click();
                    }
                });
            } else if (evt.key === 'Escape') {
                isSaving = true;
                editable.innerHTML = originalHtml;
                editable.className = originalClass;
            }
        });
    }
});
