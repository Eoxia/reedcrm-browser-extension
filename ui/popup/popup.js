
import { MESSAGE_TYPES } from '../../src/utils/constants.js';

import { fetchDoli } from './src/api/dolibarr.js';
import { extractTextFromHtml, escapeHtml, formatLineBreaksForAttribute } from './src/utils/formatters.js';
import { store } from './src/store/store.js';
import { mapTicket } from './src/models/ticket.mapper.js';
import { renderTicketItemHtml } from './src/components/ticket.js';
import { mapOpportunity } from './src/models/opportunity.mapper.js';
import { renderOppItemHtml } from './src/components/opportunity.js';
import { initInlineEdit } from './src/features/inline-edit/index.js';
import { initAttachments } from './src/features/attachments/index.js';
import { uploadFileToDoli } from './src/features/attachments/api.js';
import { attachmentsState, clearTicketFiles, clearOppFiles } from './src/features/attachments/state.js';
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
        this.searchInput.id = 'search_' + this.selectElement.id;
        this.searchInput.name = 'search_' + this.selectElement.id;
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
        const recentTicketsContainer = document.getElementById('all-ticket-container');
        const recentTicketsList = document.getElementById('recent-tickets-list');

        const oppForm = document.getElementById('opp-form');
        const btnSubmitOpp = document.getElementById('opp-btn-submit');
        
        // --- Handlers migrés pour conformité CSP ---
        const tabOppList = document.getElementById('tab-opp-list');
        const viewOppList = document.getElementById('view-opp-list');
        
        const tabTicketList = document.getElementById('tab-ticket-list');
        const viewTicketList = document.getElementById('view-ticket-list');
        
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
            if (tabTicketList) tabTicketList.classList.remove('active');
            
            viewTicket.classList.add('hidden');
            viewOpportunity.classList.add('hidden');
            if (viewOppList) viewOppList.classList.add('hidden');
            if (viewTicketList) viewTicketList.classList.add('hidden');

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
            } else if (view === 'ticket-list') {
                if (tabTicketList) tabTicketList.classList.add('active');
                if (viewTicketList) viewTicketList.classList.remove('hidden');
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
        if (tabTicketList) {
            tabTicketList.addEventListener('click', () => switchTab('ticket-list'));
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
                        
                        window.usersList = activeUsers;
                        
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
            const formContainer = document.getElementById('recent-tickets-container-form');
            const formList = document.getElementById('recent-tickets-list-form');
            if (formContainer) formContainer.classList.remove('hidden');
            
            const loaderHtml = `
                <div class="loader-container">
                    <div class="loader-spinner"></div>
                    <div>${chrome.i18n.getMessage("popup_32") || "Chargement des tickets..."}</div>
                </div>
            `;
            recentTicketsList.innerHTML = loaderHtml;
            if (formList) formList.innerHTML = loaderHtml;

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

                // Mettre à jour le Store global
                store.setUsers(usersList);
                store.setThirdparties(thirdpartiesList);
                store.setActiveProfile({ url: doliBaseUrl });

                const headers = {
                    'DOLAPIKEY': token,
                    'Accept': 'application/json'
                };
                if (entity && String(entity).trim() !== '') {
                    headers['DOLAPIENTITY'] = String(entity).trim();
                }

                let response = await fetchDoli(`${apiUrl}/tickets?sortfield=t.rowid&sortorder=DESC&limit=${limit}`, {
                    method: 'GET',
                    headers: headers
                });

                if (!response.ok && (response.status === 400 || response.status === 500)) {
                    response = await fetchDoli(`${apiUrl}/tickets?limit=${limit}`, {
                        method: 'GET',
                        headers: headers
                    });
                }

                if (response.ok) {
                    const textData = await response.text();
                    const tickets = textData.trim() ? JSON.parse(textData) : [];

                    if (Array.isArray(tickets) && tickets.length > 0) {
                        const sortedTickets = tickets.sort((a, b) => b.datec - a.datec).slice(0, limit);
                        
                        // Utiliser le Mapper et le Store
                        const mappedTickets = sortedTickets.map(t => mapTicket(t, store.state));
                        store.setTickets(mappedTickets);

                        recentTicketsList.innerHTML = '';
                        if (formList) formList.innerHTML = '';

                        // Rendu via le Composant
                        store.state.tickets.forEach(mappedTicket => {
                            const html = renderTicketItemHtml(mappedTicket);
                            
                            const div = document.createElement('div');
                            div.innerHTML = html.trim();
                            const newCard = div.firstChild;
                            recentTicketsList.appendChild(newCard);
                            
                            const imgNode = newCard.querySelector('.avatar-img');
                            if (imgNode) {
                                imgNode.addEventListener('error', function() {
                                    const initials = this.getAttribute('data-initials') || '?';
                                    this.replaceWith(document.createTextNode(initials));
                                });
                            }
                            
                            if (formList) {
                                const formDiv = document.createElement('div');
                                formDiv.innerHTML = html.trim();
                                const newFormCard = formDiv.firstChild;
                                formList.appendChild(newFormCard);
                                const formImgNode = newFormCard.querySelector('.avatar-img');
                                if (formImgNode) {
                                    formImgNode.addEventListener('error', function() {
                                        const initials = this.getAttribute('data-initials') || '?';
                                        this.replaceWith(document.createTextNode(initials));
                                    });
                                }
                            }
                        });

                        // Réattacher les événements d'édition inline

                    } else {
                        const noTicketsMsg = `<div style="text-align: center; color: #999;font-size: 11px; padding: 10px;">Aucun ticket récent trouvé (ou accès API refusé pour cet utilisateur).</div>`;
                        recentTicketsList.innerHTML = noTicketsMsg;
                        if (formList) formList.innerHTML = noTicketsMsg;
                    }
                } else {
                    recentTicketsList.innerHTML = '';
                    if (formList) formList.innerHTML = '';
                    const d = document.createElement('div'); d.style.cssText = "text-align: center; color: #e74c3c;font-size: 11px; padding: 10px;";
                    d.textContent = `Erreur API (${response.status})`;
                    recentTicketsList.appendChild(d);
                    if (formList) formList.appendChild(d.cloneNode(true));
                }
            } catch (error) {
                recentTicketsList.innerHTML = '';
                if (formList) formList.innerHTML = '';
                const d = document.createElement('div'); d.style.cssText = "text-align: center; color: #e74c3c;font-size: 11px; padding: 10px;";
                d.textContent = `Erreur JS: ${error.message}`;
                recentTicketsList.appendChild(d);
                if (formList) formList.appendChild(d.cloneNode(true));
            }
        }


        // Fonction pour charger les dernières opportunités (Projets)
        
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
                                const mappedOpp = mapOpportunity(project, { activeProfile: { url: doliBaseUrl }, oppDictionaries: { customOppDict, oppOriginDict, dolibarrNativeInputReasons }, users: usersList });
                                const html = renderOppItemHtml(mappedOpp);
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

        async function loadAllOpportunities(apiUrl, token, limit = 50, listCount, entity, oppOnly = true, isFullLoad = false) {
            const allOppList = document.getElementById('all-opp-list');
            if (!allOppList) return;
            
            if (!isFullLoad) {
                const loaderHtml = `
                    <div class="loader-container">
                        <div class="loader-spinner"></div>
                        <div>${chrome.i18n.getMessage("popup_33") || "Chargement des opportunites..."}</div>
                    </div>
                `;
                allOppList.innerHTML = loaderHtml;
            }

            const doliBaseUrl = apiUrl.replace(/\/api\/index\.php\/?$/, '');

            try {
                const headers = {
                    'DOLAPIKEY': token,
                    'Accept': 'application/json'
                };
                if (entity && String(entity).trim() !== '') {
                    headers['DOLAPIENTITY'] = String(entity).trim();
                }

                const response = await fetchDoli(`${apiUrl}/projects?sortfield=t.rowid&sortorder=DESC&limit=${limit}`, {
                    method: 'GET',
                    headers: headers
                });

                if (response.ok) {
                    const textData = await response.text();
                    const projects = textData.trim() ? JSON.parse(textData) : [];

                    if (Array.isArray(projects) && projects.length > 0) {
                        const sortedProjects = projects.sort((a, b) => b.date_c - a.date_c);
                        
                        const mappedOpps = sortedProjects.map(p => mapOpportunity(p, { activeProfile: { url: doliBaseUrl }, oppDictionaries: { customOppDict: typeof customOppDict !== 'undefined' ? customOppDict : {}, oppOriginDict: typeof oppOriginDict !== 'undefined' ? oppOriginDict : {}, dolibarrNativeInputReasons: typeof dolibarrNativeInputReasons !== 'undefined' ? dolibarrNativeInputReasons : {} }, users: typeof window.usersList !== 'undefined' ? window.usersList : [] }));
                        store.setOpportunities(mappedOpps);

                        const countEl = document.getElementById('opp-count-total');
                        if (countEl) {
                            const openCount = mappedOpps.filter(o => String(o.stat) === '1').length;
                            countEl.textContent = openCount;
                        }

                        if (!isFullLoad) allOppList.innerHTML = '';

                        let htmlToAppend = '';
                        let renderedCount = isFullLoad ? document.querySelectorAll('.opp-list-item').length : 0;
                        
                        store.state.opportunities.forEach((mappedOpp, index) => {
                            if (isFullLoad && document.getElementById(`opp-list-item-${mappedOpp.id}`)) return;
                            
                            const html = renderOppItemHtml(mappedOpp);
                            let displayStyle = index >= listCount ? 'display: none;' : '';
                            let visibilityClass = index >= listCount ? 'initially-hidden' : 'initially-visible';
                            const modifiedHtml = html.replace('class="', `class="${visibilityClass} `).replace('style="', `style="${displayStyle} `);
                            
                            htmlToAppend += modifiedHtml;
                        });
                        
                        if (htmlToAppend) {
                            allOppList.insertAdjacentHTML('beforeend', htmlToAppend);
                        }

                        if (typeof initInlineEdit === 'function') {
                            initInlineEdit(apiUrl, token, entity);
                        }
                    } else {
                        if (!isFullLoad) {
                            allOppList.innerHTML = `<div style="text-align: center; color: #999;font-size: 11px; padding: 10px;">Aucune opportunite.</div>`;
                            const countEl = document.getElementById('opp-count-total');
                            if (countEl) countEl.textContent = '0';
                        }
                    }
                } else {
                    if (!isFullLoad) {
                        allOppList.innerHTML = '';
                        const d = document.createElement('div'); d.style.cssText = "text-align: center; color: #e74c3c;font-size: 11px; padding: 10px;";
                        d.textContent = `Erreur API (${response.status})`;
                        allOppList.appendChild(d);
                        const countEl = document.getElementById('opp-count-total');
                        if (countEl) countEl.textContent = '!';
                    }
                }
            } catch (error) {
                if (!isFullLoad) {
                    allOppList.innerHTML = '';
                    const d = document.createElement('div'); d.style.cssText = "text-align: center; color: #e74c3c;font-size: 11px; padding: 10px;";
                    d.textContent = `Erreur JS: ${error.message}`;
                    allOppList.appendChild(d);
                    const countEl = document.getElementById('opp-count-total');
                    if (countEl) countEl.textContent = '!';
                }
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
                loadRecentTickets(p.doliUrl, p.doliApiToken, listCount, p.doliEntity, usersPromise, thirdpartiesPromise);
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
                usersPromise.then(users => {
                    setupOppAssignees(users);
                    
                    // Populate ticket assignee filter
                    const assigneeSelect = document.getElementById('ticket-filter-assignee');
                    if (assigneeSelect) {
                        users.forEach(u => {
                            const opt = document.createElement('option');
                            opt.value = u.id;
                            let displayName = (u.firstname || u.lastname) ? `${u.firstname || ''} ${u.lastname || ''}`.trim() : u.login;
                            if (displayName.length > 15) {
                                displayName = displayName.substring(0, 15) + '...';
                            }
                            opt.textContent = displayName;
                            assigneeSelect.appendChild(opt);
                        });
                        
                        // Select current user if we wanted to (but user asked for 'All' by default)
                        // It defaults to 'all' because the first option is 'all'.
                    }
                });

                // Vérification des droits GED pour afficher un avertissement si nécessaire
                const gedWarning = document.getElementById('ged-warning');
                const pasteZone = document.getElementById('paste-zone');
                
                if (gedWarning && p.permissions && p.permissions.ged_pr === false) {
                    gedWarning.classList.remove('hidden');
                    gedWarning.innerHTML = `L'API de votre Dolibarr ne permet pas l'upload des fichiers joints aux tickets.<br> Voir <a href="https://github.com/Dolibarr/dolibarr/pull/37499" target="_blank" style="color: #c0392b; text-decoration: underline;">PR#37499</a> ou utilisez Dolibarr v23+.`;
                    
                    if (pasteZone) {
                        const uploadZone = pasteZone.querySelector('.dashed-upload-zone');
                        if (uploadZone) {
                            uploadZone.style.display = 'none';
                        }
                    }
                } else if (gedWarning && p.doliStatus && p.doliStatus.ged !== 'ok') {
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
                    if (attachmentsState.oppFiles.length > 0 && projectId) {
                        btnSubmitOpp.querySelector('.btn-text span[data-i18n]').textContent = chrome.i18n.getMessage('popup_js_120');

                        for (let fileObj of attachmentsState.oppFiles) {
                            try {
                                await uploadFileToDoli(apiUrl, token, entity, fileObj.file, 'project', projectRef);
                            } catch (err) {
                                throw new DoliError('ReedCRM-4005', err.message, { substitution: projectRef });
                            }
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
                    clearOppFiles();
                    const oppPreviewContainer = document.getElementById('opp-preview-container');
                    if (oppPreviewContainer) {
                        oppPreviewContainer.innerHTML = '';
                        oppPreviewContainer.classList.add('hidden');
                    }
                    
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

                if (attachmentsState.ticketFiles.length > 0 && ticketId) {
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

                    if (attachmentsState.ticketFiles.length > 0 && ticketRef) {
                        btnSubmit.querySelector('.btn-text span[data-i18n]').textContent = chrome.i18n.getMessage('popup_js_120');
                        for (let fileObj of attachmentsState.ticketFiles) {
                            try {
                                await uploadFileToDoli(apiUrl, token, entity, fileObj.file, 'ticket', ticketId.toString());
                            } catch (err) {
                                throw new DoliError('ReedCRM-4006', err.message, { substitution: ticketRef });
                            }
                        }
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
                clearTicketFiles();
                const ticketPreviewContainer = document.getElementById('preview-container');
                if (ticketPreviewContainer) {
                    ticketPreviewContainer.innerHTML = '';
                    ticketPreviewContainer.classList.add('hidden');
                }
                
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
                    
                    let detailsMsg = error.message;
                    if (detailsMsg.includes('fichier. ')) {
                        detailsMsg = detailsMsg.split('fichier. ')[1].trim();
                    } else if (detailsMsg.includes('pièce jointe échouée:')) {
                        detailsMsg = detailsMsg.split('pièce jointe échouée:')[1].trim();
                    }
                    detailsMsg = detailsMsg.replace('PR#37499', '<a href="https://github.com/Dolibarr/dolibarr/pull/37499" target="_blank" style="text-decoration:underline; color:#e74c3c;">PR#37499</a>');

                    statusMessage.innerHTML = `
                        <div style="font-size:13px; text-align:center; padding: 10px; margin-top: 10px; border: 1px solid #e74c3c; border-radius: 4px; background: #fdfdfd;">
                            <span style="color:#e67e22; font-weight:bold; font-size:13px;">⚠️ Création partielle du ticket : <a href="${baseUrl}/ticket/card.php?id=${extractedRef}" target="_blank" style="text-decoration:underline; color:#e67e22;">${extractedRef}</a></span><br>
                            <span style="color:#c0392b; font-weight:bold; font-size:13px; display:inline-block; margin-top:4px;">Attention la pièce n'est pas envoyée</span><br>
                            <small style="color:#e74c3c; display:inline-block; margin-top:4px;"><i>Détail : ${detailsMsg}</i></small>
                        </div>
                    `;
                } else {
                    showDoliError(error, statusMessage);
                }
                btnSubmit.querySelector('.btn-text span[data-i18n]').textContent = chrome.i18n.getMessage('popup_js_127');
            }
        });

        initAttachments();

        const btnClearTicket = document.getElementById('btn-clear-ticket');
        if (btnClearTicket) {
            btnClearTicket.addEventListener('click', () => {
                document.getElementById('ticket-form').reset();
                document.getElementById('ticket-subject').focus();
                clearTicketFiles();
                const previewContainer = document.getElementById('preview-container');
                if (previewContainer) { previewContainer.innerHTML = ''; previewContainer.classList.add('hidden'); }
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
                clearOppFiles();
                const oppPreviewContainer = document.getElementById('opp-preview-container');
                if (oppPreviewContainer) { oppPreviewContainer.innerHTML = ''; oppPreviewContainer.classList.add('hidden'); }
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
        
        // Recherche dans les tickets
        const ticketSearchInput = document.getElementById('ticket-search-input');
        
        let currentTicketDateFilter = 'month'; // Keep 'month' as default based on user request
        let currentTicketAssigneeFilter = 'all';

        function applyTicketFilters() {
            const query = (ticketSearchInput ? ticketSearchInput.value : '').toLowerCase().trim();
            const items = document.querySelectorAll('.recent-ticket-item:not(.opp-list-item)'); // Sélectionne uniquement les tickets
            
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
                if (currentTicketDateFilter) {
                    const itemDate = parseFloat(item.getAttribute('data-date')) || 0;
                    if (currentTicketDateFilter === 'yesterday') {
                        // Moins de 48h (approximation de "hier")
                        matchDate = (now - itemDate) <= (2 * ONE_DAY);
                    } else if (currentTicketDateFilter === 'week') {
                        matchDate = (now - itemDate) <= ONE_WEEK;
                    } else if (currentTicketDateFilter === 'month') {
                        matchDate = (now - itemDate) <= ONE_MONTH;
                    }
                }

                let matchAssignee = true;
                if (currentTicketAssigneeFilter && currentTicketAssigneeFilter !== 'all') {
                    const itemAssignee = item.getAttribute('data-assignee');
                    if (currentTicketAssigneeFilter === 'unassigned') {
                        matchAssignee = !itemAssignee || itemAssignee === 'null' || itemAssignee === '0' || itemAssignee === '';
                    } else {
                        matchAssignee = (String(itemAssignee) === String(currentTicketAssigneeFilter));
                    }
                }

                if (matchSearch && matchDate && matchAssignee) {
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
            
            const countEl = document.getElementById('ticket-count-total');
            if (countEl) {
                countEl.textContent = visibleCount;
            }
        }

        if (ticketSearchInput) {
            let debounceTimerTkt;
            ticketSearchInput.addEventListener('input', () => {
                clearTimeout(debounceTimerTkt);
                debounceTimerTkt = setTimeout(() => {
                    applyTicketFilters();
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

        const ticketQuickFilters = document.querySelectorAll('.ticket-quick-filter');
        ticketQuickFilters.forEach(btn => {
            if (btn.getAttribute('data-filter') === 'month') {
                btn.classList.add('active');
            }
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const filter = e.currentTarget.getAttribute('data-filter');
                if (filter === 'all') {
                    currentTicketDateFilter = null;
                } else {
                    currentTicketDateFilter = filter;
                }
                
                ticketQuickFilters.forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');

                applyTicketFilters();
            });
        });

        const ticketFilterAssignee = document.getElementById('ticket-filter-assignee');
        if (ticketFilterAssignee) {
            ticketFilterAssignee.addEventListener('change', (e) => {
                currentTicketAssigneeFilter = e.target.value;
                if (currentTicketAssigneeFilter !== 'all') {
                    ticketFilterAssignee.style.backgroundColor = '#2563eb';
                    ticketFilterAssignee.style.color = '#ffffff';
                } else {
                    ticketFilterAssignee.style.backgroundColor = '#e2e8f0';
                    ticketFilterAssignee.style.color = '#475569';
                }
                applyTicketFilters();
            });
        }

    } catch (fatalError) {
        document.body.innerHTML = `<div style="padding: 20px; color: red; font-family: sans-serif;">
            <h3 style="margin-top:0;">Erreur fatale de l'extension</h3>
            <p>${fatalError.message}</p>
            <pre style="font-size:10px; overflow:auto; background:#eee; padding:5px;">${fatalError.stack}</pre>
        </div>`;
    }
});

    initInlineEdit();
