import { fetchDoli } from '../../api/dolibarr.js';
import { CustomSelect } from '../../../../components/custom-select.js';

let doliUrl = '';
let apiToken = '';
let doliEntity = '';
let profileConfig = null;
let currentMode = 'rh'; // 'standard' or 'rh' — RH est le mode par défaut
let selectedHrTask = null;
let isTimesheetInitialized = false;
let selectedDate = new Date(); // date courante sélectionnée dans le picker

// ─── Utilitaire : formate une date en YYYY-MM-DD ────────────────────────────
function toLocalDateStr(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

// ─── Sélecteur de semaine ────────────────────────────────────────────────────
/**
 * Retourne le lundi de la semaine contenant `date`.
 * @param {Date} date
 * @returns {Date}
 */
function getMondayOf(date) {
    const d = new Date(date);
    const day = d.getDay(); // 0=dim, 1=lun...
    const diff = (day === 0 ? -6 : 1 - day);
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

/**
 * Construit les boutons Lu-Ma-Me-Je-Ve de la semaine courante.
 */
function buildWeekPicker() {
    const container = document.getElementById('ts-week-days');
    if (!container) return;
    container.innerHTML = '';

    const monday = getMondayOf(selectedDate);
    const DAY_NAMES = ['LUN', 'MAR', 'MER', 'JEU', 'VEN'];

    for (let i = 0; i < 5; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ts-day-btn';

        const isActive = toLocalDateStr(d) === toLocalDateStr(selectedDate);
        if (isActive) btn.classList.add('ts-day-active');

        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();

        btn.innerHTML = `
            <span class="ts-day-name">${DAY_NAMES[i]}</span>
            <span class="ts-day-num">${String(d.getDate()).padStart(2, '0')}</span>
            <span class="ts-day-month">${month}/${year}</span>`;

        btn.addEventListener('click', () => {
            selectedDate = new Date(d);
            // Synchronise l'input date caché
            const dateInput = document.getElementById('time-date');
            if (dateInput) dateInput.value = toLocalDateStr(selectedDate);
            buildWeekPicker(); // re-render pour mettre à jour active
        });

        container.appendChild(btn);
    }
}

/**
 * Affiche les infos du projet RH et le compteur mensuel.
 */
function updateHrProjectInfo() {
    const label = document.getElementById('ts-hr-project-label');
    const monthName = document.getElementById('ts-month-name');
    const monthlyHours = document.getElementById('ts-monthly-hours');
    const infoBlock = document.getElementById('ts-hr-project-info');
    const counterBlock = document.getElementById('ts-monthly-counter');

    if (!profileConfig || !profileConfig.doliHrProject) {
        if (infoBlock) infoBlock.style.display = 'none';
        if (counterBlock) counterBlock.style.display = 'none';
        return;
    }

    if (infoBlock) infoBlock.style.display = '';
    if (counterBlock) counterBlock.style.display = '';

    // Afficher la référence du projet RH
    if (label) {
        label.textContent = profileConfig.doliHrProjectRef
            ? `${profileConfig.doliHrProjectRef} -  ${profileConfig.doliHrProjectTitle || ''}`
            : `Projet RH #${profileConfig.doliHrProject}`;
    }

    // Mois courant en français
    const months = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
    if (monthName) monthName.textContent = `${months[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;
    if (monthlyHours) monthlyHours.textContent = '—'; // sera mis à jour par fetchMonthlyHours
}

export function initTimesheet(url, token, entity, profile) {
    doliUrl = url;
    apiToken = token;
    doliEntity = entity;
    profileConfig = profile;

    const setupContainer = document.getElementById('timesheet-setup-container');
    const mainContainer = document.getElementById('timesheet-main-container');

    if (!profileConfig || !profileConfig.doliHrProject) {
        if (setupContainer) setupContainer.classList.remove('hidden');
        if (mainContainer) mainContainer.classList.add('hidden');
        loadSetupProjects();
    } else {
        if (setupContainer) setupContainer.classList.add('hidden');
        if (mainContainer) mainContainer.classList.remove('hidden');
        loadStandardProjects();
        buildHrUi();
    }

    // Initialiser la date d'aujourd'hui
    selectedDate = new Date();
    const dateInput = document.getElementById('time-date');
    if (dateInput) dateInput.value = toLocalDateStr(selectedDate);

    // Construire le picker de semaine
    buildWeekPicker();
    updateHrProjectInfo();

    // Navigation semaine précédente / suivante
    document.getElementById('ts-week-prev')?.addEventListener('click', () => {
        selectedDate.setDate(selectedDate.getDate() - 7);
        buildWeekPicker();
        if (dateInput) dateInput.value = toLocalDateStr(selectedDate);
        updateHrProjectInfo();
    });
    document.getElementById('ts-week-next')?.addEventListener('click', () => {
        selectedDate.setDate(selectedDate.getDate() + 7);
        buildWeekPicker();
        if (dateInput) dateInput.value = toLocalDateStr(selectedDate);
        updateHrProjectInfo();
    });

    if (isTimesheetInitialized) return;
    isTimesheetInitialized = true;

    // SETUP LISTENERS
    const setupProjSelect = document.getElementById('time-setup-project');
    if (setupProjSelect) {
        setupProjSelect.addEventListener('change', (e) => {
            loadSetupTasks(e.target.value);
        });
    }
    const saveBtn = document.getElementById('btn-save-time-setup');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveSetup);
    }

    // Tabs mode RH / Standard
    const btnStandard = document.getElementById('btn-mode-standard');
    const btnRh = document.getElementById('btn-mode-rh');
    const modeStandard = document.getElementById('timesheet-mode-standard');
    const modeRh = document.getElementById('timesheet-mode-rh');

    if (btnStandard && btnRh) {
        btnRh.addEventListener('click', () => {
            currentMode = 'rh';
            btnRh.classList.add('ts-tab-active');
            btnStandard.classList.remove('ts-tab-active');
            modeRh.classList.remove('hidden');
            modeStandard.classList.add('hidden');
            document.getElementById('ts-hr-project-info')?.style.setProperty('display', '');
            document.getElementById('ts-monthly-counter')?.style.setProperty('display', '');
            checkSubmitStatus();
            buildHrUi();
        });

        btnStandard.addEventListener('click', () => {
            currentMode = 'standard';
            btnStandard.classList.add('ts-tab-active');
            btnRh.classList.remove('ts-tab-active');
            modeStandard.classList.remove('hidden');
            modeRh.classList.add('hidden');
            document.getElementById('ts-hr-project-info')?.style.setProperty('display', 'none');
            document.getElementById('ts-monthly-counter')?.style.setProperty('display', 'none');
            checkSubmitStatus();
        });
    }

    // Activer le mode RH par défaut si configuré
    if (profileConfig && profileConfig.doliHrProject) {
        currentMode = 'rh';
        btnRh?.classList.add('ts-tab-active');
        btnStandard?.classList.remove('ts-tab-active');
        modeRh?.classList.remove('hidden');
        modeStandard?.classList.add('hidden');
    } else {
        currentMode = 'standard';
        btnStandard?.classList.add('ts-tab-active');
        btnRh?.classList.remove('ts-tab-active');
        modeStandard?.classList.remove('hidden');
        modeRh?.classList.add('hidden');
        document.getElementById('ts-hr-project-info')?.style.setProperty('display', 'none');
        document.getElementById('ts-monthly-counter')?.style.setProperty('display', 'none');
    }

    const projSelect = document.getElementById('time-project');
    if (projSelect) {
        projSelect.addEventListener('change', (e) => {
            loadStandardTasks(e.target.value);
            checkSubmitStatus();
        });
    }

    const taskSelect = document.getElementById('time-task');
    if (taskSelect) taskSelect.addEventListener('change', checkSubmitStatus);

    const durationInput = document.getElementById('time-duration');
    if (durationInput) durationInput.addEventListener('input', checkSubmitStatus);

    const btnSubmit = document.getElementById('btn-submit-time');
    if (btnSubmit) btnSubmit.addEventListener('click', submitTime);
}


function checkSubmitStatus() {
    const btnSubmit = document.getElementById('btn-submit-time');
    if (!btnSubmit) return;

    let isValid = false;
    const duration = document.getElementById('time-duration')?.value;
    const date = document.getElementById('time-date')?.value;
    
    if (duration && date) {
        if (currentMode === 'standard') {
            const task = document.getElementById('time-task')?.value;
            if (task && task !== '') isValid = true;
        } else {
            if (selectedHrTask) isValid = true;
        }
    }

    btnSubmit.disabled = !isValid;
}

async function loadStandardProjects() {
    const select = document.getElementById('time-project');
    if (!select) return;

    const headers = { 'DOLAPIKEY': apiToken, 'Accept': 'application/json' };
    if (doliEntity) headers['DOLAPIENTITY'] = doliEntity;

    try {
        const res = await fetchDoli(`${doliUrl}/projects?limit=10000&status=1&sortfield=t.rowid&sortorder=DESC`, { headers });
        if (res.ok) {
            const projects = await res.json();
            if (Array.isArray(projects)) {
                projects.forEach(p => {
                    const opt = document.createElement('option');
                    opt.value = p.id;
                    opt.textContent = `${p.ref} - ${p.title}`;
                    select.appendChild(opt);
                });
                
                // Init Custom Select
                if (!window.timeProjectSelect) {
                    window.timeProjectSelect = new CustomSelect(select);
                } else {
                    window.timeProjectSelect.update();
                }
            }
        }
    } catch(e) {
        console.error('Error fetching standard projects', e);
    }
}

async function loadStandardTasks(projectId) {
    const select = document.getElementById('time-task');
    if (!select) return;

    select.innerHTML = '<option value="">Sélectionner une tâche</option>';
    select.disabled = true;

    if (!projectId) {
        if (window.timeTaskSelect) window.timeTaskSelect.update();
        return;
    }

    const headers = { 'DOLAPIKEY': apiToken, 'Accept': 'application/json' };
    if (doliEntity) headers['DOLAPIENTITY'] = doliEntity;

    try {
        const res = await fetchDoli(`${doliUrl}/tasks?sqlfilters=(t.fk_projet:=:${projectId})&limit=100`, { headers });
        if (res.ok) {
            const tasks = await res.json();
            if (Array.isArray(tasks)) {
                tasks.forEach(t => {
                    const opt = document.createElement('option');
                    opt.value = t.id;
                    opt.textContent = `${t.ref} - ${t.label}`;
                    select.appendChild(opt);
                });
                select.disabled = false;
            }
        }
    } catch(e) {
        console.error('Error fetching standard tasks', e);
    }

    if (!window.timeTaskSelect) {
        window.timeTaskSelect = new CustomSelect(select);
    } else {
        window.timeTaskSelect.update();
    }
}

async function buildHrUi() {
    const presContainer = document.getElementById('hr-presence-container');
    const absContainer  = document.getElementById('hr-absence-container');
    if (!presContainer || !absContainer) return;

    if (presContainer.dataset.loaded === 'true') return;

    presContainer.innerHTML = '<span style="font-size:11px;color:#999;">Chargement...</span>';
    absContainer.innerHTML  = '<span style="font-size:11px;color:#999;">Chargement...</span>';

    const projectId = profileConfig?.doliHrProject;
    if (!projectId) {
        presContainer.innerHTML = '<span style="font-size:11px;color:#e74c3c;">Projet RH non configuré. Allez dans les options.</span>';
        absContainer.innerHTML  = '';
        return;
    }

    const headers = { 'DOLAPIKEY': apiToken, 'Accept': 'application/json' };
    if (doliEntity) headers['DOLAPIENTITY'] = doliEntity;

    try {
        const res = await fetchDoli(`${doliUrl}/tasks?sqlfilters=(t.fk_projet:=:${projectId})&limit=100`, { headers });
        if (res.ok) {
            const tasks = await res.json();
            presContainer.innerHTML = '';
            absContainer.innerHTML  = '';

            const presIds = profileConfig.doliHrPresenceTasks || [];
            const absIds  = profileConfig.doliHrAbsenceTasks  || [];

            let presFound = false;
            let absFound  = false;

            if (Array.isArray(tasks)) {
                tasks.forEach(t => {
                    const idStr = String(t.id);
                    if (presIds.includes(idStr)) {
                        presContainer.appendChild(createHrCard(t.id, t.ref, t.label, 'presence'));
                        presFound = true;
                    }
                    if (absIds.includes(idStr)) {
                        absContainer.appendChild(createHrCard(t.id, t.ref, t.label, 'absence'));
                        absFound = true;
                    }
                });
            }

            if (!presFound) presContainer.innerHTML = '<span style="font-size:11px;color:#94a3b8;font-style:italic;">Aucune tâche configurée</span>';
            if (!absFound)  absContainer.innerHTML  = '<span style="font-size:11px;color:#94a3b8;font-style:italic;">Aucune tâche configurée</span>';

            presContainer.dataset.loaded = 'true';
        }
    } catch(e) {
        presContainer.innerHTML = '<span style="font-size:11px;color:#e74c3c;">Erreur réseau</span>';
        absContainer.innerHTML  = '';
    }
}

/**
 * Crée une carte de tâche RH avec input durée, bouton étoile, et note inline.
 * Conforme AGENTS.md : createElement/textContent uniquement, pas d'innerHTML avec données API.
 * @param {string|number} taskId
 * @param {string} ref   - Référence Dolibarr ex: "TK2301-0268"
 * @param {string} label - Libellé de la tâche ex: "Formation externe"
 * @param {'presence'|'absence'} type
 * @returns {HTMLElement}
 */
function createHrCard(taskId, ref, label, type) {
    // ── Carte racine ──────────────────────────────────────────────────────────
    const card = document.createElement('div');
    card.className = 'ts-hr-card';
    card.dataset.taskId = String(taskId);
    card.dataset.type   = type;

    // ── Ligne principale ──────────────────────────────────────────────────────
    const mainRow = document.createElement('div');
    mainRow.className = 'ts-hr-card-main';

    // -- Info (icône + ref + label) -------------------------------------------
    const info = document.createElement('div');
    info.className = 'ts-hr-card-info';

    const refSpan = document.createElement('span');
    refSpan.className = 'ts-hr-card-ref';

    // Icône SVG (statique, aucune donnée utilisateur)
    const iconSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    iconSvg.setAttribute('width', '14'); iconSvg.setAttribute('height', '14');
    iconSvg.setAttribute('viewBox', '0 0 24 24'); iconSvg.setAttribute('fill', 'none');
    iconSvg.setAttribute('stroke', 'currentColor'); iconSvg.setAttribute('stroke-width', '2');
    iconSvg.setAttribute('stroke-linecap', 'round'); iconSvg.setAttribute('stroke-linejoin', 'round');
    iconSvg.classList.add('ts-card-icon');
    const path1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path1.setAttribute('d', 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z');
    const poly1 = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    poly1.setAttribute('points', '14 2 14 8 20 8');
    iconSvg.appendChild(path1); iconSvg.appendChild(poly1);

    const refText = document.createTextNode('\u00a0' + (ref || ''));  // donnée API via textContent
    refSpan.appendChild(iconSvg);
    refSpan.appendChild(refText);

    const labelSpan = document.createElement('span');
    labelSpan.className = 'ts-hr-card-label';
    labelSpan.textContent = label;  // donnée API via textContent

    info.appendChild(refSpan);
    info.appendChild(labelSpan);

    // -- Input temps ----------------------------------------------------------
    const timeInput = document.createElement('input');
    timeInput.type      = 'time';
    timeInput.className = 'ts-hr-time-input';
    timeInput.title     = chrome.i18n.getMessage('time_card_duration_title');

    // -- Bouton étoile --------------------------------------------------------
    const starBtn = document.createElement('button');
    starBtn.type      = 'button';
    starBtn.className = 'ts-hr-star-btn';
    starBtn.title     = chrome.i18n.getMessage('time_card_save_title');

    // SVG étoile (statique)
    const starSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    starSvg.setAttribute('width', '16'); starSvg.setAttribute('height', '16');
    starSvg.setAttribute('viewBox', '0 0 24 24'); starSvg.setAttribute('fill', 'none');
    starSvg.setAttribute('stroke', 'currentColor'); starSvg.setAttribute('stroke-width', '1.5');
    starSvg.setAttribute('stroke-linecap', 'round'); starSvg.setAttribute('stroke-linejoin', 'round');
    const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    polygon.setAttribute('points', '12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2');
    starSvg.appendChild(polygon);
    starBtn.appendChild(starSvg);

    mainRow.appendChild(info);
    mainRow.appendChild(timeInput);
    mainRow.appendChild(starBtn);

    // ── Zone note (cachée par défaut) ─────────────────────────────────────────
    const noteRow = document.createElement('div');
    noteRow.className = 'ts-hr-card-note-row hidden';

    const noteInput = document.createElement('textarea');
    noteInput.className   = 'ts-hr-note-input';
    noteInput.rows        = 2;
    noteInput.placeholder = chrome.i18n.getMessage('time_card_note_placeholder');
    noteRow.appendChild(noteInput);

    // ── Div statut par carte ──────────────────────────────────────────────────
    const statusDiv = document.createElement('div');
    statusDiv.className = 'ts-hr-card-status hidden';

    card.appendChild(mainRow);
    card.appendChild(noteRow);
    card.appendChild(statusDiv);

    // ── Interactions ──────────────────────────────────────────────────────────

    // Révéler la note quand une durée est saisie
    timeInput.addEventListener('change', () => {
        if (timeInput.value) {
            noteRow.classList.remove('hidden');
            card.classList.add('ts-hr-card-active');
        } else {
            noteRow.classList.add('hidden');
            card.classList.remove('ts-hr-card-active', 'ts-hr-card-done');
            starBtn.classList.remove('ts-star-active');
        }
    });

    // Étoile = soumettre ce temps via l'API
    starBtn.addEventListener('click', async () => {
        const duration = timeInput.value;
        if (!duration) {
            timeInput.focus();
            timeInput.style.borderColor = '#e74c3c';
            setTimeout(() => { timeInput.style.borderColor = ''; }, 1500);
            return;
        }

        const dateVal = document.getElementById('time-date')?.value || toLocalDateStr(selectedDate);
        const note    = noteInput.value || '';

        // Parse HH:MM → secondes
        const [h, m] = duration.split(':').map(Number);
        const durationInSeconds = (h * 3600) + (m * 60);

        // Format date Dolibarr "YYYY-MM-DD HH:MM:SS"
        const d = new Date(dateVal + 'T00:00:00');
        const pad = n => String(n).padStart(2, '0');
        const dateStr = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} 00:00:00`;

        // Feedback UI
        starBtn.disabled = true;
        starBtn.classList.add('ts-star-loading');
        statusDiv.classList.add('hidden');

        const reqHeaders = {
            'DOLAPIKEY': apiToken,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        };
        if (doliEntity) reqHeaders['DOLAPIENTITY'] = doliEntity;

        try {
            const res = await fetchDoli(`${doliUrl}/tasks/${taskId}/addtimespent`, {
                method: 'POST',
                headers: reqHeaders,
                body: JSON.stringify({ date: dateStr, duration: durationInSeconds, note })
            });

            starBtn.classList.remove('ts-star-loading');

            if (res.ok) {
                card.classList.add('ts-hr-card-done');
                starBtn.classList.add('ts-star-active');
                statusDiv.classList.remove('hidden');
                statusDiv.style.color = '#22c55e';
                statusDiv.textContent = chrome.i18n.getMessage('time_card_saved');
                if (note) noteRow.classList.remove('hidden');
            } else {
                starBtn.disabled = false;
                statusDiv.classList.remove('hidden');
                statusDiv.style.color = '#e74c3c';
                statusDiv.textContent = chrome.i18n.getMessage('time_card_error_prefix') + ' ' + res.statusText;
            }
        } catch(e) {
            starBtn.disabled = false;
            starBtn.classList.remove('ts-star-loading');
            statusDiv.classList.remove('hidden');
            statusDiv.style.color = '#e74c3c';
            statusDiv.textContent = chrome.i18n.getMessage('time_card_error_network');
        }
    });

    return card;
}


async function submitTime() {
    const btn = document.getElementById('btn-submit-time');
    const statusDiv = document.getElementById('time-status');
    const date = document.getElementById('time-date').value;
    const duration = document.getElementById('time-duration').value;
    const note = document.getElementById('time-note').value;
    
    let taskId = null;
    if (currentMode === 'standard') {
        taskId = document.getElementById('time-task').value;
    } else {
        taskId = selectedHrTask;
    }

    if (!taskId) return;

    btn.disabled = true;
    btn.classList.add('loading');
    statusDiv.textContent = '';
    
    // Parse duration HH:MM
    const parts = duration.split(':');
    let h = parseInt(parts[0], 10) || 0;
    let m = parseInt(parts[1], 10) || 0;
    const durationInSeconds = (h * 3600) + (m * 60);

    // Date au format attendu par l'API Dolibarr : "YYYY-MM-DD HH:MM:SS"
    const dObj = new Date(date + 'T00:00:00');
    const pad = (n) => String(n).padStart(2, '0');
    const dateStr = `${dObj.getFullYear()}-${pad(dObj.getMonth()+1)}-${pad(dObj.getDate())} 00:00:00`;
    
    const payload = {
        date: dateStr,
        duration: durationInSeconds,
        note: note,
        user_id: 0  // 0 = utilisateur authentifié par défaut
    };

    const headers = { 
        'DOLAPIKEY': apiToken, 
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    };
    if (doliEntity) headers['DOLAPIENTITY'] = doliEntity;

    try {
        const res = await fetchDoli(`${doliUrl}/tasks/${taskId}/addtimespent`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
        });

        btn.classList.remove('loading');

        if (res.ok) {
            statusDiv.style.color = '#2ecc71';
            statusDiv.textContent = 'Temps enregistré avec succès !';
            setTimeout(() => {
                statusDiv.textContent = '';
                document.getElementById('time-note').value = '';
                btn.disabled = false;
            }, 3000);
        } else {
            statusDiv.style.color = '#e74c3c';
            statusDiv.textContent = "Erreur lors de l'enregistrement : " + res.statusText;
            btn.disabled = false;
        }
    } catch(e) {
        btn.classList.remove('loading');
        btn.disabled = false;
        statusDiv.style.color = '#e74c3c';
        statusDiv.textContent = 'Erreur réseau';
    }
}

// --- SETUP FUNCTIONS ---

async function loadSetupProjects() {
    const select = document.getElementById('time-setup-project');
    if (!select) return;

    const headers = { 'DOLAPIKEY': apiToken, 'Accept': 'application/json' };
    if (doliEntity) headers['DOLAPIENTITY'] = doliEntity;

    try {
        const res = await fetchDoli(`${doliUrl}/projects?limit=10000&status=1&sortfield=t.rowid&sortorder=DESC`, { headers });
        if (res.ok) {
            const projects = await res.json();
            select.innerHTML = '<option value="">Sélectionnez un projet RH</option>';
            if (Array.isArray(projects)) {
                projects.forEach(p => {
                    const opt = document.createElement('option');
                    opt.value = p.id;
                    opt.textContent = `${p.ref} - ${p.title}`;
                    select.appendChild(opt);
                });
                
                if (!window.timeSetupProjectSelect) {
                    window.timeSetupProjectSelect = new CustomSelect(select);
                } else {
                    window.timeSetupProjectSelect.update();
                }
            }
        }
    } catch(e) {
        select.innerHTML = '<option value="">Erreur de chargement</option>';
        console.error('Error fetching setup projects', e);
    }
}

async function loadSetupTasks(projectId) {
    const presContainer = document.getElementById('time-setup-presence-container');
    const absContainer = document.getElementById('time-setup-absence-container');
    const saveBtn = document.getElementById('btn-save-time-setup');
    
    if (!presContainer || !absContainer || !saveBtn) return;
    
    saveBtn.disabled = true;

    if (!projectId) {
        presContainer.innerHTML = "<span style='color: #94a3b8; font-style: italic;'>Sélectionnez le projet d'abord</span>";
        absContainer.innerHTML = "<span style='color: #94a3b8; font-style: italic;'>Sélectionnez le projet d'abord</span>";
        return;
    }

    presContainer.innerHTML = '<span style="color: #94a3b8; font-style: italic;">Chargement...</span>';
    absContainer.innerHTML = '<span style="color: #94a3b8; font-style: italic;">Chargement...</span>';

    const headers = { 'DOLAPIKEY': apiToken, 'Accept': 'application/json' };
    if (doliEntity) headers['DOLAPIENTITY'] = doliEntity;

    try {
        const res = await fetchDoli(`${doliUrl}/tasks?sqlfilters=(t.fk_projet:=:${projectId})&limit=100`, { headers });
        if (res.ok) {
            const tasks = await res.json();
            presContainer.innerHTML = '';
            absContainer.innerHTML = '';
            
            if (Array.isArray(tasks) && tasks.length > 0) {
                tasks.forEach(t => {
                    presContainer.appendChild(createSetupCheckbox(t.id, t.label, 'presence'));
                    absContainer.appendChild(createSetupCheckbox(t.id, t.label, 'absence'));
                });
                saveBtn.disabled = false;
            } else {
                presContainer.innerHTML = '<span style="color: #e74c3c;">Aucune tâche trouvée</span>';
                absContainer.innerHTML = '<span style="color: #e74c3c;">Aucune tâche trouvée</span>';
            }
        }
    } catch(e) {
        presContainer.innerHTML = '<span style="color: #e74c3c;">Erreur réseau</span>';
        absContainer.innerHTML = '<span style="color: #e74c3c;">Erreur réseau</span>';
    }
}

function createSetupCheckbox(taskId, label, type) {
    const labelEl = document.createElement('label');
    labelEl.style.display = 'flex';
    labelEl.style.alignItems = 'center';
    labelEl.style.gap = '8px';
    labelEl.style.cursor = 'pointer';
    labelEl.style.padding = '6px';
    labelEl.style.borderRadius = '4px';
    labelEl.style.transition = 'background 0.2s';
    
    labelEl.onmouseover = () => labelEl.style.background = '#f1f5f9';
    labelEl.onmouseout = () => labelEl.style.background = 'transparent';
    
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.value = taskId;
    input.className = `setup-cb-${type}`;
    input.style.accentColor = type === 'presence' ? '#2ecc71' : '#f39c12';
    input.style.width = '16px';
    input.style.height = '16px';
    input.style.cursor = 'pointer';
    
    const span = document.createElement('span');
    span.textContent = label;
    span.style.fontSize = '12px';
    span.style.color = '#334155';
    
    labelEl.appendChild(input);
    labelEl.appendChild(span);
    return labelEl;
}

function saveSetup() {
    const saveBtn = document.getElementById('btn-save-time-setup');
    const projectId = document.getElementById('time-setup-project').value;
    
    if (!projectId) return;
    
    const presTasks = Array.from(document.querySelectorAll('.setup-cb-presence:checked')).map(cb => cb.value);
    const absTasks = Array.from(document.querySelectorAll('.setup-cb-absence:checked')).map(cb => cb.value);
    
    if (saveBtn) {
        saveBtn.disabled = true;
        const textSpan = saveBtn.querySelector('.btn-text');
        if (textSpan) textSpan.innerHTML = 'Sauvegarde... <span class="spinner" style="margin-left: 8px;"></span>';
    }
    
    chrome.storage.sync.get(['doliProfiles', 'doliActiveProfileId'], (items) => {
        let profiles = items.doliProfiles || [];
        let pIdx = -1;
        if (items.doliActiveProfileId) {
            pIdx = profiles.findIndex(prof => prof.id === items.doliActiveProfileId);
        }
        if (pIdx === -1 && profiles.length > 0) pIdx = 0;
        
        if (pIdx !== -1) {
            profiles[pIdx].doliHrProject = projectId;
            profiles[pIdx].doliHrPresenceTasks = presTasks;
            profiles[pIdx].doliHrAbsenceTasks = absTasks;
            // Sauvegarder aussi la ref et le titre pour l'affichage dans le bloc info
            const projSelect = document.getElementById('time-setup-project');
            const selectedOption = projSelect ? projSelect.options[projSelect.selectedIndex] : null;
            if (selectedOption && selectedOption.text) {
                const parts = selectedOption.text.split(' - ');
                profiles[pIdx].doliHrProjectRef = parts[0] || '';
                profiles[pIdx].doliHrProjectTitle = parts.slice(1).join(' - ') || '';
            }
            
            chrome.storage.sync.set({ doliProfiles: profiles }, () => {
                // Update local profileConfig
                profileConfig = profiles[pIdx];
                
                // Re-init the UI by calling initTimesheet again which will now see doliHrProject
                initTimesheet(doliUrl, apiToken, doliEntity, profileConfig);
                
                // Switch to HR mode as they just configured it
                const btnRh = document.getElementById('btn-mode-rh');
                if (btnRh) btnRh.click();
                
                if (saveBtn) {
                    const textSpan = saveBtn.querySelector('.btn-text');
                    if (textSpan) textSpan.innerHTML = 'Enregistré !';
                }
            });
        }
    });
}
