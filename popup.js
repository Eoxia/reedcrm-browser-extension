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
        this.searchInput.placeholder = 'Rechercher...';
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
            if (text.toLowerCase().includes(lowercaseFilter)) {
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
            noMatch.textContent = 'Aucun résultat...';
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

            if (view === 'opportunite') {
                tabOpportunite.classList.add('active');
                tabTicket.classList.remove('active');
                viewOpportunity.classList.remove('hidden');
                viewTicket.classList.add('hidden');
                if (projectContainer) projectContainer.style.display = 'none'; // Pas de projet dans une opportunité
            } else {
                tabTicket.classList.add('active');
                tabOpportunite.classList.remove('active');
                viewTicket.classList.remove('hidden');
                viewOpportunity.classList.add('hidden');
                if (projectContainer) projectContainer.style.display = ''; // On réaffiche pour les tickets
            }
        }

        tabTicket.addEventListener('click', () => switchTab('ticket'));
        tabOpportunite.addEventListener('click', () => switchTab('opportunite'));

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
                const response = await fetch(`${apiUrl}/users?limit=500&statut=1`, {
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
            try {
                // mode=1 pour ne lister que les clients/prospects (souvent suffisant pour devis/tickets)
                const response = await fetch(`${apiUrl}/thirdparties?limit=500&sortfield=t.nom&sortorder=ASC&mode=1`, {
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
                        tiers.forEach(t => {
                            const option = document.createElement('option');
                            option.value = t.id;
                            option.textContent = t.name || t.nom || `Tiers #${t.id}`;
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
                const response = await fetch(`${apiUrl}/contacts?limit=500&sortfield=t.lastname&sortorder=ASC&thirdparty_ids=${socid}`, {
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
                const response = await fetch(`${apiUrl}/projects?limit=500&sortfield=t.ref&sortorder=DESC&thirdparty_ids=${socid}`, {
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
        async function loadRecentTickets(apiUrl, token, limit = 10, entity) {
            recentTicketsContainer.classList.remove('hidden');
            recentTicketsList.innerHTML = `<div style="text-align: center; color: #999;font-size: 11px; padding: 10px;">Chargement des tickets...</div>`;

            try {
                const doliBaseUrl = apiUrl.replace(/\/api\/index\.php\/?$/, '');

                const headers = {
                    'DOLAPIKEY': token,
                    'Accept': 'application/json'
                };
                if (entity && String(entity).trim() !== '') {
                    headers['DOLAPIENTITY'] = String(entity).trim();
                }

                // On retire tous les paramètres complexes (sortorder, sortfield, sqlfilters) car ils
                // provoquent des erreurs 400 ou 500 sur certaines versions de l'API Dolibarr.
                // On demande juste un lot de 100 tickets bruts, et on triera en JavaScript.
                const response = await fetch(`${apiUrl}/tickets?limit=100`, {
                    method: 'GET',
                    headers: headers
                });

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

                            // Détermination de la couleur de la puce d'état
                            let statusColor = "#95a5a6"; // Gris par défaut (Inconnu)
                            const stat = String(ticket.status || ticket.fk_statut || ticket.statut || "").toLowerCase();

                            if (stat === "0") {
                                statusColor = "#e74c3c"; // Rouge (Brouillon/Non lu)
                            } else if (stat === "1") {
                                statusColor = "#3498db"; // Bleu (À valider/Nouveau)
                            } else if (stat === "2" || stat === "3" || stat === "4" || stat === "5") {
                                statusColor = "#f39c12"; // Orange (En cours)
                            } else if (stat === "7" || stat === "8") {
                                statusColor = "#27ae60"; // Vert (Résolu/Fermé)
                            } else if (stat === "9") {
                                statusColor = "#7f8c8d"; // Gris foncé (Annulé)
                            }

                            const ticketRef = ticket.ref || ticket.track_id || `Ticket #${ticket.id}`;

                            // Construction du HTML 
                            const ticketHtml = `
                            <div class="recent-ticket-item">
                                <div class="rt-left">
                                    <div class="rt-ref" title="Référence du ticket">${ticketRef}</div>
                                    <div class="rt-subject" title="${ticket.subject}">${subject}</div>
                                </div>
                                <div class="rt-right" style="display: flex; align-items: center; gap: 8px;">
                                    <div class="rt-status-dot" title="Statut: ${stat}" style="width: 8px; height: 8px; border-radius: 50%; background-color: ${statusColor};"></div>
                                    <a href="${doliBaseUrl}/ticket/card.php?id=${ticket.id}" target="_blank" class="rt-link" title="Ouvrir">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #0ea5e9;"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                                    </a>
                                </div>
                            </div>
                        `;
                            recentTicketsList.insertAdjacentHTML('beforeend', ticketHtml);
                        });
                    } else {
                        recentTicketsList.innerHTML = `<div style="text-align: center; color: #999;font-size: 11px; padding: 10px;">Aucun ticket récent trouvé (ou accès API refusé pour cet utilisateur).</div>`;
                    }
                } else {
                    recentTicketsList.innerHTML = `<div style="text-align: center; color: #e74c3c;font-size: 11px; padding: 10px;">Erreur API (${response.status})</div>`;
                }
            } catch (error) {
                recentTicketsList.innerHTML = `<div style="text-align: center; color: #e74c3c;font-size: 11px; padding: 10px;">Erreur JS: ${error.message}</div>`;
            }
        }

        // Fonction pour charger les dernières opportunités (Projets)
        async function loadRecentOpportunities(apiUrl, token, limit = 10, entity, doliOppOnly = true, usersPromise = null) {
            recentOppContainer.classList.remove('hidden');
            recentOppList.innerHTML = `<div style="text-align: center; color: #999;font-size: 11px; padding: 10px;">Chargement des opportunités...</div>`;

            try {
                const doliBaseUrl = apiUrl.replace(/\/api\/index\.php\/?$/, '');
                const headers = { 'DOLAPIKEY': token, 'Accept': 'application/json' };
                if (entity && String(entity).trim() !== '') {
                    headers['DOLAPIENTITY'] = String(entity).trim();
                }

                // On demande directement les derniers projets créés (t.rowid DESC) 
                // pour s'assurer d'avoir les opportunités les plus récentes.
                const response = await fetch(`${apiUrl}/projects?sortfield=t.rowid&sortorder=DESC&limit=100`, {
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
                            recentOppList.innerHTML = ''; // Nettoyer
                            const sortedProjects = oppProjects.sort((a, b) => b.date_c - a.date_c).slice(0, limit);
                            
                            let usersList = [];
                            if (usersPromise) {
                                try { usersList = await usersPromise || []; } catch(e) { console.error("Erreur attente users dans opp", e); }
                            }

                            sortedProjects.forEach(project => {
                                let subject = project.title || project.ref || "Projet sans titre";
                                if (subject.length > 50) subject = subject.substring(0, 50) + '...';

                                let statusColor = "#95a5a6";
                                const stat = String(project.statut || project.status || "0");
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

                                let line1Html = '';
                                const fullName = `${oppPrenom} ${oppNom}`.trim();
                                if (fullName && oppTel) {
                                    line1Html = `<span class="copy-able rt-name" data-copy="${fullName}" title="Double clic pour copier">${fullName}</span><span class="rt-sep">&bull;</span><span class="copy-able rt-tel" data-copy="${oppTel}" title="Double clic pour copier">${oppTel}</span>`;
                                } else if (fullName) {
                                    line1Html = `<span class="copy-able rt-name" data-copy="${fullName}" title="Double clic pour copier">${fullName}</span>`;
                                } else if (oppTel) {
                                    line1Html = `<span class="copy-able rt-tel" data-copy="${oppTel}" title="Double clic pour copier">${oppTel}</span>`;
                                }

                                let line2Html = '';
                                const truncInfo = (s) => (s && s.length > 45) ? s.substring(0, 45) + '...' : s;
                                let displayEmail = truncInfo(oppEmail);

                                if (oppEmail && oppWebsite) {
                                    let href = oppWebsite.startsWith('http') ? oppWebsite : `https://${oppWebsite}`;
                                    let domain = oppWebsite.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
                                    let displayDomain = truncInfo(domain);
                                    line2Html = `<span class="rt-email copy-able" data-copy="${oppEmail}" title="Double clic pour copier l'email">${displayEmail}</span><span class="rt-sep">&bull;</span><a href="${href}" target="_blank" class="rt-contact-link rt-website" title="Ouvrir le site internet">${displayDomain}</a>`;
                                } else if (oppEmail) {
                                    line2Html = `<span class="rt-email copy-able" data-copy="${oppEmail}" title="Double clic pour copier l'email">${displayEmail}</span>`;
                                } else if (oppWebsite) {
                                    let href = oppWebsite.startsWith('http') ? oppWebsite : `https://${oppWebsite}`;
                                    let domain = oppWebsite.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
                                    let displayDomain = truncInfo(domain);
                                    line2Html = `<a href="${href}" target="_blank" class="rt-contact-link rt-website" title="Ouvrir le site internet">${displayDomain}</a>`;
                                }
                                
                                let contactHtml = '';
                                if (line1Html !== '' || line2Html !== '') {
                                    contactHtml = `<div class="rt-contact">`;
                                    if (line1Html !== '') {
                                        contactHtml += `<div class="rt-contact-line1">${line1Html}</div>`;
                                    }
                                    if (line2Html !== '') {
                                        contactHtml += `<div class="rt-contact-line2">${line2Html}</div>`;
                                    }
                                    contactHtml += `</div>`;
                                }

                                // Intégration du Player Audio depuis l'extrafield "Vocal" ou directement depuis l'API
                                let extraPlayerHtml = '';
                                const vocalVal = project.vocal_file || project.vocal || opts.options_vocal || opts.options_reedcrm_vocal || opts.options_fichier_vocal || '';
                                if (vocalVal) {
                                    // Si c'est une URL externe complète (ex: lien Aircall/3CX)
                                    if (vocalVal.startsWith('http')) {
                                        extraPlayerHtml = `<div style="margin-top: 4px;"><audio controls src="${vocalVal}" style="height: 25px; width: 100%; max-width: 250px; outline: none; border-radius: 20px; background: #f1f5f9;"></audio></div>`;
                                    } else {
                                        // Si c'est juste un nom de fichier stocké dans l'attribut supplémentaire, on préparera un slot pour le chargeur asynchrone
                                        extraPlayerHtml = `<div id="vocal-slot-${project.id}" data-filename="${vocalVal}"></div>`;
                                    }
                                }

                                const html = `
                            <div class="recent-ticket-item">
                                <div class="rt-left">
                                    <div class="rt-ref-group" style="display: flex; align-items: center; gap: 6px;">
                                        <div class="rt-ref" title="Référence">${projectRef}</div>
                                        ${dateCStr ? `<span class="rt-sep">&bull;</span><div style="font-size: 10px; color: #888;">${dateCStr}</div>` : ''}
                                        ${initials !== "?" ? `<span class="rt-sep">&bull;</span><div style="font-size: 9px; background: #e2e8f0; color: #475569; padding: 1px 4px; border-radius: 4px;" title="Créé par">#${initials}</div>` : ''}
                                    </div>
                                    <div class="rt-subject" title="${project.title || ''}">${subject}</div>
                                    ${contactHtml}
                                    ${extraPlayerHtml}
                                    <div id="audio-slot-${project.id}"></div>
                                </div>
                                <div class="rt-right" style="display: flex; align-items: center; gap: 8px;">
                                    ${(probDisplay || amountDisplay) ? `
                                    <div class="rt-stats">
                                        <div class="rt-prob">${probDisplay}</div>
                                        <div class="rt-amount">${amountDisplay}</div>
                                    </div>
                                    ` : ''}
                                    <div class="rt-status-dot" title="Statut: ${stat}" style="width: 8px; height: 8px; border-radius: 50%; background-color: ${statusColor}; flex-shrink: 0;"></div>
                                    <a href="${doliBaseUrl}/projet/card.php?id=${project.id}" target="_blank" class="rt-link" title="Ouvrir">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #0ea5e9;"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                                    </a>
                                </div>
                            </div>`;
                                recentOppList.insertAdjacentHTML('beforeend', html);

                                // Recherche asynchrone pointue d'un fichier audio ciblé par l'extrafield ou la liste des documents joints
                                setTimeout(async () => {
                                    try {
                                        let targetFileName = null;
                                        const vocalSlot = document.getElementById(`vocal-slot-${project.id}`);
                                        if (vocalSlot && vocalSlot.dataset.filename) {
                                            targetFileName = vocalSlot.dataset.filename; // Venant de opts.options_vocal
                                        }
                                        
                                        // Scan asynchrone du dossier projet par la route REST si pas d'extrafield défini
                                        if (!targetFileName) {
                                            const docRes = await fetch(`${apiUrl}/documents?modulepart=project&id=${project.id}`, { headers: headers });
                                            if (docRes.ok) {
                                                const docs = await docRes.json();
                                                if (Array.isArray(docs)) {
                                                    const audioDoc = docs.find(d => {
                                                        const n = d.name.toLowerCase();
                                                        return n.endsWith('.wav') || n.endsWith('.mp3') || n.endsWith('.m4a');
                                                    });
                                                    if (audioDoc) targetFileName = audioDoc.name;
                                                }
                                            }
                                        }

                                        if (targetFileName) {
                                            const slot = vocalSlot || document.getElementById(`audio-slot-${project.id}`);
                                            if (slot) {
                                                const playerStyle = 'height: 25px; width: 100%; max-width: 250px; outline: none; margin-top: 6px; border-radius: 20px; background: #f1f5f9;';
                                                
                                                // Approche 1: Téléchargement du fichier sous forme de flux Base64 par l'API
                                                const dlRes = await fetch(`${apiUrl}/documents/download?modulepart=project&original_file=${encodeURIComponent(project.ref + '/' + targetFileName)}`, { headers: headers });
                                                if (dlRes.ok) {
                                                    const dlJson = await dlRes.json();
                                                    if (dlJson && dlJson.content) {
                                                        const mime = targetFileName.toLowerCase().endsWith('.mp3') ? 'audio/mpeg' : 'audio/wav';
                                                        const dataUri = `data:${mime};base64,${dlJson.content}`;
                                                        slot.innerHTML = `<audio controls src="${dataUri}" style="${playerStyle}" controlslist="nodownload"></audio>`;
                                                        return; // Succès
                                                    }
                                                }
                                                
                                                // Approche 2 (Fallback absolu): Streaming HTTPS direct depuis le serveur WAMP (nécessite une session, ce qui est validé sur la machine locale chrome)
                                                const doliRoot = apiUrl.replace(/\/api\/index\.php\/?$/, '').replace(/\/htdocs\/api\/index\.php\/?$/, '/htdocs');
                                                const fallbackUrl = `${doliRoot}/document.php?modulepart=projet&file=${encodeURIComponent(project.ref + '/' + targetFileName)}`;
                                                slot.innerHTML = `<audio controls src="${fallbackUrl}" style="${playerStyle}" controlslist="nodownload"></audio>`;
                                            }
                                        }
                                    } catch(e) { console.error("Audio Load Error", e); }
                                }, 150 + (limit * 5)); // Léger délai décalé

                            });
                        } else {
                            recentOppList.innerHTML = `<div style="text-align: center; color: #999;font-size: 11px; padding: 10px;">Aucune opportunité trouvée.</div>`;
                        }
                    } else {
                        recentOppList.innerHTML = `<div style="text-align: center; color: #999;font-size: 11px; padding: 10px;">Aucune opportunité trouvée.</div>`;
                    }
                } else {
                    recentOppList.innerHTML = `<div style="text-align: center; color: #e74c3c;font-size: 11px; padding: 10px;">Erreur API (${response.status})</div>`;
                }
            } catch (error) {
                recentOppList.innerHTML = `<div style="text-align: center; color: #e74c3c;font-size: 11px; padding: 10px;">Erreur JS: ${error.message}</div>`;
            }
        }

        // Vérifie si l'API est configurée et gère le multi-profils
        chrome.storage.sync.get(['doliProfiles', 'doliActiveProfileId', 'doliDefaultView', 'doliRecentCount'], (items) => {
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

            // --- SUITE LOGIQUE HABITUELLE (avec le profil P) ---
            if (p && p.doliUrl && p.doliApiToken) {
                // Configuration OK, on affiche le formulaire
                setupWarning.classList.add('hidden');
                ticketForm.classList.remove('hidden');
                btnSubmit.disabled = false;
                btnSubmit.querySelector('.btn-text').textContent = 'Créer le ticket';

                if (oppForm) {
                    oppForm.classList.remove('hidden');
                    btnSubmitOpp.disabled = false;
                    btnSubmitOpp.querySelector('.btn-text').textContent = 'Créer l\'opportunité';
                }

                const oppOnly = p.doliOppOnly !== false; // true par défaut
                let activeTab = items.doliDefaultView === 'opportunite' ? 'opportunite' : 'ticket';

                // Chargement des utilisateurs en arrière-plan (on garde la promesse)
                const usersPromise = loadUsers(p.doliUrl, p.doliApiToken, p.doliLogin, p.doliAutoAssign, p.doliEntity);

                // Chargement des Tiers (Clients/Prospects)
                loadThirdparties(p.doliUrl, p.doliApiToken, p.doliEntity);
                
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
                loadRecentTickets(p.doliUrl, p.doliApiToken, recentLimit, p.doliEntity);
                loadRecentOpportunities(p.doliUrl, p.doliApiToken, recentLimit, p.doliEntity, oppOnly, usersPromise);

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
                chrome.storage.local.get(prefillKeys, async (localItems) => {
                    if (localItems.doliActiveTab) {
                        activeTab = localItems.doliActiveTab;
                    }
                    if (activeTab === 'opportunite') {
                        switchTab('opportunite');
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
                            if (probaVal) probaVal.textContent = `(${localItems.doliPrefillOppProba}%)`;
                        }
                        if (localItems.doliPrefillOppMontant) document.getElementById('opp-montant').value = localItems.doliPrefillOppMontant;
                    } else {
                        switchTab('ticket');
                        if (localItems.doliPrefillSubject) document.getElementById('ticket-subject').value = localItems.doliPrefillSubject;
                        if (localItems.doliPrefillMessage) document.getElementById('ticket-message').value = localItems.doliPrefillMessage;
                        if (localItems.doliPrefillAssignee) {
                            await usersPromise; // On attend que la liste déroulante soit remplie
                            assigneeSelect.value = localItems.doliPrefillAssignee;
                        }
                    }

                    // On charge les sélections Tiers/Contact/Projet de façon globale (valable pour les 2 onglets)
                    if (localItems.doliPrefillTicketTiers) {
                        const tiersElem = document.getElementById('ticket-tiers');
                        if (tiersElem) {
                            // On attend un peu que la liste des tiers soit chargée
                            setTimeout(() => {
                                tiersElem.value = localItems.doliPrefillTicketTiers;
                                if (window.ticketTiersSelect) window.ticketTiersSelect.update();
                                
                                // Déclencher le loadContacts
                                loadContacts(p.doliUrl, p.doliApiToken, p.doliEntity, localItems.doliPrefillTicketTiers).then(() => {
                                    if (localItems.doliPrefillTicketContact) {
                                        const contactElem = document.getElementById('ticket-contact');
                                        if (contactElem) {
                                            contactElem.value = localItems.doliPrefillTicketContact;
                                            if (window.ticketContactSelect) window.ticketContactSelect.update();
                                        }
                                    }
                                });

                                // Déclencher le loadProjects
                                loadProjects(p.doliUrl, p.doliApiToken, p.doliEntity, localItems.doliPrefillTicketTiers).then(() => {
                                    if (localItems.doliPrefillTicketProject) {
                                        const projectElem = document.getElementById('ticket-project');
                                        if (projectElem) {
                                            projectElem.value = localItems.doliPrefillTicketProject;
                                            if (window.ticketProjectSelect) window.ticketProjectSelect.update();
                                        }
                                    }
                                });
                            }, 500);
                        }
                    }

                    // On nettoie la mémoire locale pour ne pas pré-remplir la prochaine fois
                    chrome.storage.local.remove(prefillKeys);
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
                    probaVal.textContent = `(${probaInput.value}%)`;
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
                const assigneeId = oppAssigneeSelect.value;
                
                const tiersSelectElem = document.getElementById('ticket-tiers');
                const tiersId = tiersSelectElem ? tiersSelectElem.value : '';
                
                const projectSelectElem = document.getElementById('ticket-project');
                const projectId = projectSelectElem ? projectSelectElem.value : '';

                btnSubmitOpp.disabled = true;
                btnSubmitOpp.classList.add('btn-loading');
                btnSubmitOpp.querySelector('.btn-text').textContent = 'Création Opportunité...';
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

                    // Tentative d'injection native du contact à la création (comme pour les tickets)
                    const contactSelectElem = document.getElementById('ticket-contact');
                    const contactId = contactSelectElem ? contactSelectElem.value : '';
                    if (contactId && contactId !== '') {
                        projectData.contactid = parseInt(contactId, 10);
                        projectData.fk_contact = parseInt(contactId, 10);
                    }

                    const response = await fetch(`${apiUrl}/projects`, {
                        method: 'POST',
                        headers: baseHeaders,
                        body: JSON.stringify(projectData)
                    });

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => null);
                        throw new DoliError('ReedCRM-4002', errorData);
                    }

                    const projResponseId = await response.json();
                    
                    btnSubmitOpp.querySelector('.btn-text').textContent = 'Projet créé...';
                    
                    // Some Dolibarr versions/endpoints return an array [144] or a single int 144
                    const projectId = Array.isArray(projResponseId) ? projResponseId[0] : projResponseId;

                    // Ajout du contact sélectionné au projet (comme Contributeur)
                    let contactWasAssigned = true;
                    let contactErrorCode = null;
                    let contactErrorDetail = '';

                    if (contactId && contactId !== '') {
                        try {
                            const contactRes = await fetch(`${apiUrl}/projects/${projectId}/contacts`, {
                                method: 'POST',
                                headers: baseHeaders,
                                body: JSON.stringify({
                                    fk_socpeople: parseInt(contactId, 10),
                                    type_contact: "PROJECTCONTRIBUTOR",
                                    source: "external"
                                })
                            });
                            // Si PROJECTCONTRIBUTOR échoue, on essaie d'autres codes potentiels "CUSTOMER", "PROJECT_CONTRIBUTOR", "PROJECTCONTACT"
                            if (!contactRes.ok) {
                                const errFirst = await contactRes.json().catch(() => null);
                                const errFirstMsg = errFirst?.error?.message || `HTTP ${contactRes.status}`;
                                
                                const contactResFallback = await fetch(`${apiUrl}/projects/${projectId}/contacts`, {
                                    method: 'POST',
                                    headers: baseHeaders,
                                    body: JSON.stringify({
                                        fk_socpeople: parseInt(contactId, 10),
                                        type_contact: "PROJECT_CONTRIBUTOR",
                                        source: "external"
                                    })
                                });
                                
                                if (!contactResFallback.ok) {
                                    const errFall = await contactResFallback.json().catch(() => null);
                                    
                                    contactWasAssigned = false;
                                    contactErrorCode = 'ReedCRM-4001';
                                    contactErrorDetail = errFall?.error?.message || errFirstMsg || 'Inconnue';
                                    
                                    try {
                                        const versionRes = await fetch(`${apiUrl}/status`, { headers: baseHeaders });
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
                                }
                            }
                            
                            if (contactWasAssigned) {
                                btnSubmitOpp.querySelector('.btn-text').textContent = 'Contact affecté...';
                                await new Promise(r => setTimeout(r, 600)); // Laisser l'utilisateur lire le message
                            }
                        } catch(e) {
                            console.warn("Impossible d'associer le contact à l'opportunité:", e);
                            contactWasAssigned = false;
                            contactErrorCode = 'ReedCRM-4003';
                            btnSubmitOpp.querySelector('.btn-text').textContent = 'Erreur réseau Contact...';
                            await new Promise(r => setTimeout(r, 600));
                        }
                    }

                    // Récupérer les détails du projet pour avoir la référence (PROJ...)
                    let projectRef = projectId;
                    try {
                        // Cherche le dernier projet créé (qui devrait être celui-ci) pour récupérer sa Ref propre
                        const refResponse = await fetch(`${apiUrl}/projects?sortfield=t.rowid&sortorder=DESC&limit=1`, {
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
                    let fileToSend = oppPastedFile;
                    if (!fileToSend && fileInput.files.length > 0) {
                        fileToSend = fileInput.files[0];
                    }

                    if (fileToSend && projectId) {
                        btnSubmitOpp.querySelector('.btn-text').textContent = 'Envoi Pièce jointe...';

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

                                    const docResponse = await fetch(`${apiUrl}/documents/upload`, {
                                        method: 'POST',
                                        headers: baseHeaders,
                                        body: JSON.stringify(documentData)
                                    });

                                    if (!docResponse.ok) {
                                        const docError = await docResponse.json().catch(() => null);
                                        let errorMsg = docError?.error?.message || ERROR_DICTIONARY['ReedCRM-4002'].userMessage;
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

                    const baseUrl = apiUrl.replace(/\/api\/index\.php\/?$/, '').replace(/\/htdocs\/api\/index\.php\/?$/, '/htdocs');
                    const projectLink = `${baseUrl}/projet/card.php?id=${projectId}`;

                    btnSubmitOpp.disabled = false;
                    btnSubmitOpp.classList.remove('btn-loading');
                    btnSubmitOpp.querySelector('.btn-text').textContent = 'Opportunité créée !';
                    
                    let contactErrorHtml = '';
                    if (contactId && contactId !== '' && !contactWasAssigned) {
                        let errorMsg = ERROR_DICTIONARY[contactErrorCode]?.userMessage || "Erreur inconnue";
                        
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
                    if (typeof removeOppPastedImage === 'function') removeOppPastedImage();

                    setTimeout(() => window.close(), 5000);

                } catch (error) {
                    btnSubmitOpp.classList.remove('btn-loading');
                    // We reset the text so error doesn't overwrite the button completely wrongly
                    btnSubmitOpp.querySelector('.btn-text').textContent = 'Réessayer';
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
            btnSubmit.querySelector('.btn-text').textContent = 'Création du ticket...';
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

                const response = await fetch(`${apiUrl}/tickets`, {
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

                // Détermination du fichier à envoyer (priorité au fichier collé si existant, sinon champ classique)
                let fileToSend = pastedFile;
                if (!fileToSend && fileInput.files.length > 0) {
                    fileToSend = fileInput.files[0];
                }

                // 2. Gestion de la pièce jointe (si présente)
                if (fileToSend && ticketId) {
                    btnSubmit.querySelector('.btn-text').textContent = 'Envoi de la pièce jointe...';

                    // --- Récupération de la référence textuelle (ex: TCK2402-0001) ---
                    // Pour l'affichage final, on récupère la Ref textuelle.
                    const getTicketRes = await fetch(`${apiUrl}/tickets/${ticketId}`, {
                        headers: baseHeaders
                    });

                    let ticketRef = ticketId.toString();
                    if (getTicketRes.ok) {
                        const ticketDetails = await getTicketRes.json();
                        if (ticketDetails && ticketDetails.ref) {
                            ticketRef = ticketDetails.ref;
                        }
                    }

                    // --- Lecture du fichier en base64 ---
                    const reader = new FileReader();
                    reader.readAsDataURL(fileToSend);

                    await new Promise((resolve, reject) => {
                        reader.onload = async () => {
                            try {
                                // Data URL format: "data:image/png;base64,iVBORw0KGgo..."
                                const base64Content = reader.result.split(',')[1];

                                // IMPORTANT : Pour le module 'ticket', l'API Dolibarr (selon le fichier api_documents.class.php)
                                // attend l'ID numérique ($object->fetch((int) $ref)) dans le champ 'ref' et non la ref texte.
                                const documentData = {
                                    filecontent: base64Content,
                                    filename: fileToSend.name,
                                    fileencoding: "base64",
                                    modulepart: "ticket",
                                    ref: ticketId.toString() // Le PHP modifié attend l'ID numérique ($fetchbyid = true)
                                };

                                const docResponse = await fetch(`${apiUrl}/documents/upload`, {
                                    method: 'POST',
                                    headers: baseHeaders,
                                    body: JSON.stringify(documentData)
                                });

                                if (!docResponse.ok) {
                                    const docError = await docResponse.json().catch(() => null);
                                    let errorMsg = ERROR_DICTIONARY['ReedCRM-4004'].userMessage;
                                    if (docError && docError.error && docError.error.message) {
                                        errorMsg = docError.error.message;
                                        // Capture ciblée pour l'erreur Dolibarr d'upload ticket si jamais
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
                } else if (ticketId) {
                    // Si pas de fichier, on récupère quand même la ref pour l'affichage
                    const getTicketRes = await fetch(`${apiUrl}/tickets/${ticketId}`, {
                        headers: baseHeaders
                    });
                    if (getTicketRes.ok) {
                        const ticketDetails = await getTicketRes.json();
                        if (ticketDetails && ticketDetails.ref) {
                            ticketIdOrRef = ticketDetails.ref; // On écrase ticketId avec la ref texte si dispo
                        }
                    }
                }

                // Génération du lien vers l'interface web Dolibarr
                // On retire la partie "/api/index.php" (ou sa variante) de l'URL pour pointer vers la racine web
                const baseUrl = apiUrl.replace(/\/api\/index\.php\/?$/, '').replace(/\/htdocs\/api\/index\.php\/?$/, '/htdocs');
                const ticketLink = `${baseUrl}/ticket/card.php?id=${ticketId}`;
                const displayRef = (typeof ticketRef !== 'undefined') ? ticketRef : (typeof ticketIdOrRef !== 'undefined' ? ticketIdOrRef : ticketId);

                // Succès final (On injecte du HTML ici pour avoir un lien cliquable)
                btnSubmit.classList.remove('btn-loading');
                btnSubmit.querySelector('.btn-text').textContent = 'Ticket créé !';
                statusMessage.innerHTML = `
                    <div style="color:#27ae60; font-size:13px; text-align:left;">
                        Ticket <a href="${ticketLink}" target="_blank" style="text-decoration:none; font-weight:bold; color:#27ae60;" title="Voir le ticket">${displayRef}</a> créé avec succès !
                    </div>
                `;
                ticketForm.reset();
                if (typeof removePastedImage === 'function') removePastedImage();

            } catch (error) {
                btnSubmit.classList.remove('btn-loading');
                btnSubmit.querySelector('.btn-text').textContent = 'Réessayer';
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
                btnSubmit.textContent = 'Réessayer';
            }
        });

        // --- Gestion du collage d'image (Presse-papier) ---
        let pastedFile = null;
        const previewContainer = document.getElementById('preview-container');
        const imagePreview = document.getElementById('image-preview');
        const btnRemoveImage = document.getElementById('btn-remove-image');
        const fileInput = document.getElementById('ticket-file');

        let oppPastedFile = null;
        const oppPreviewContainer = document.getElementById('opp-preview-container');
        const oppImagePreview = document.getElementById('opp-image-preview');
        const oppBtnRemoveImage = document.getElementById('opp-btn-remove-image');
        const oppFileInput = document.getElementById('opp-file');

        // Écoute l'événement 'paste' n'importe où sur la fenêtre du popup
        document.addEventListener('paste', (e) => {
            // Ignorer si c'est collé dans un champ texte (pour ne pas bloquer le texte)
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

                        const reader = new FileReader();
                        reader.onload = (event) => {
                            if (tabOpportunite.classList.contains('active')) {
                                oppPastedFile = newFile;
                                oppImagePreview.src = event.target.result;
                                oppPreviewContainer.classList.remove('hidden');
                                if (oppFileInput) oppFileInput.value = '';
                            } else {
                                pastedFile = newFile;
                                imagePreview.src = event.target.result;
                                previewContainer.classList.remove('hidden');
                                if (fileInput) fileInput.value = '';
                            }
                        };
                        reader.readAsDataURL(blob);

                        e.preventDefault();
                        break;
                    }
                }
            }
        });

        // Suppression de l'image collée
        window.removePastedImage = function () {
            pastedFile = null;
            imagePreview.src = '';
            if (previewContainer) previewContainer.classList.add('hidden');
        }
        window.removeOppPastedImage = function () {
            oppPastedFile = null;
            oppImagePreview.src = '';
            if (oppPreviewContainer) oppPreviewContainer.classList.add('hidden');
        }

        if (btnRemoveImage) btnRemoveImage.addEventListener('click', () => removePastedImage());
        if (oppBtnRemoveImage) oppBtnRemoveImage.addEventListener('click', () => removeOppPastedImage());

        // Si on choisit un fichier via le bouton classique, on supprime l'image collée
        if (fileInput) fileInput.addEventListener('change', () => { if (fileInput.files.length > 0) removePastedImage(); });
        if (oppFileInput) oppFileInput.addEventListener('change', () => { if (oppFileInput.files.length > 0) removeOppPastedImage(); });

        // --- Gestion du bouton "Capturer l'écran" ---
        const btnCaptureScreen = document.getElementById('btn-capture-screen');
        const oppBtnCaptureScreen = document.getElementById('opp-btn-capture-screen');

        const triggerCapture = async (btnElement, statusElementId) => {
            try {
                btnElement.textContent = "Capture...";
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

                chrome.storage.local.set(storageData);

                // 1. Déclencher la capture
                chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
                    if (chrome.runtime.lastError || !dataUrl) {
                        const err = chrome.runtime.lastError ? chrome.runtime.lastError.message : "Pas d'image";
                        if (statusMessage) {
                            statusMessage.textContent = "Erreur capture (Permissions ?): " + err;
                            statusMessage.style.color = "#e74c3c";
                        }
                        resetCaptureButton(btnElement);
                        return;
                    }

                    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                        if (!tabs || tabs.length === 0) {
                            if (statusMessage) {
                                statusMessage.textContent = "Erreur: Impossible de trouver l'onglet actif.";
                                statusMessage.style.color = "#e74c3c";
                            }
                            resetCaptureButton(btnElement);
                            return;
                        }

                        let promises = tabs.map(tab => {
                            return new Promise(resolve => {
                                chrome.tabs.sendMessage(tab.id, {
                                    action: "START_IN_PAGE_EDITOR",
                                    image: dataUrl
                                }, (response) => {
                                    if (chrome.runtime.lastError) resolve({ success: false, error: chrome.runtime.lastError.message });
                                    else resolve({ success: true });
                                });
                            });
                        });

                        const timeout = new Promise(resolve => setTimeout(() => resolve([{ success: false, timeout: true }]), 1500));

                        Promise.race([Promise.all(promises), timeout]).then((results) => {
                            let failed = false;
                            for (let res of results) if (!res.success) failed = true;

                            if (failed) {
                                if (statusMessage) {
                                    statusMessage.textContent = "Veuillez recharger la page web (F5) pour activer la capture.";
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
                    statusMessage.textContent = "Bug critique capture: " + e.message;
                    statusMessage.style.color = "#e74c3c";
                }
                btnElement.disabled = false;
                btnElement.textContent = "Erreur Capture";
            }
        };

        function resetCaptureButton(btn) {
            btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px; vertical-align: text-bottom;"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg> Capturer';
            btn.disabled = false;
        }

        if (btnCaptureScreen) btnCaptureScreen.addEventListener('click', () => triggerCapture(btnCaptureScreen, 'status-message'));
        if (oppBtnCaptureScreen) oppBtnCaptureScreen.addEventListener('click', () => triggerCapture(oppBtnCaptureScreen, 'opp-status-message'));

        // --- Chargement automatique d'une capture en attente (depuis l'éditeur in-page) ---
        chrome.storage.local.get(['doliPendingScreenshot', 'doliActiveTab'], (result) => {
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

                        if (activeTabScreenshot === 'opportunite') {
                            oppPastedFile = newFile;
                            oppImagePreview.src = dataUrl;
                            if (oppPreviewContainer) oppPreviewContainer.classList.remove('hidden');
                            if (oppFileInput) oppFileInput.value = '';
                        } else {
                            pastedFile = newFile;
                            imagePreview.src = dataUrl;
                            if (previewContainer) previewContainer.classList.remove('hidden');
                            if (fileInput) fileInput.value = '';
                        }
                    });
            }
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
                e.target.textContent = 'Copié !';
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
