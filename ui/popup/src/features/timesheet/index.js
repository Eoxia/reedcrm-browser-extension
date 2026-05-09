import { fetchDoli } from '../../api/dolibarr.js';
import { CustomSelect } from '../../../../components/custom-select.js';

let doliUrl = '';
let apiToken = '';
let doliEntity = '';
let profileConfig = null;
let currentMode = 'standard'; // 'standard' or 'rh'
let selectedHrTask = null;
let isTimesheetInitialized = false;

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
    }

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

    const btnStandard = document.getElementById('btn-mode-standard');
    const btnRh = document.getElementById('btn-mode-rh');
    const modeStandard = document.getElementById('timesheet-mode-standard');
    const modeRh = document.getElementById('timesheet-mode-rh');
    
    // Set today's date
    const dateInput = document.getElementById('time-date');
    if (dateInput) {
        const today = new Date();
        dateInput.value = today.toISOString().split('T')[0];
    }

    if (btnStandard && btnRh) {
        btnStandard.addEventListener('click', () => {
            currentMode = 'standard';
            btnStandard.style.background = '#3498db';
            btnStandard.style.color = 'white';
            btnRh.style.background = 'white';
            btnRh.style.color = '#475569';
            modeStandard.classList.remove('hidden');
            modeRh.classList.add('hidden');
            checkSubmitStatus();
        });

        btnRh.addEventListener('click', () => {
            currentMode = 'rh';
            btnRh.style.background = '#3498db';
            btnRh.style.color = 'white';
            btnStandard.style.background = 'white';
            btnStandard.style.color = '#475569';
            modeRh.classList.remove('hidden');
            modeStandard.classList.add('hidden');
            checkSubmitStatus();
            
            // Build HR UI if not built
            buildHrUi();
        });
    }

    const projSelect = document.getElementById('time-project');
    if (projSelect) {
        projSelect.addEventListener('change', (e) => {
            loadStandardTasks(e.target.value);
            checkSubmitStatus();
        });
    }

    const taskSelect = document.getElementById('time-task');
    if (taskSelect) {
        taskSelect.addEventListener('change', checkSubmitStatus);
    }
    
    const durationInput = document.getElementById('time-duration');
    if (durationInput) {
        durationInput.addEventListener('input', checkSubmitStatus);
    }

    const btnSubmit = document.getElementById('btn-submit-time');
    if (btnSubmit) {
        btnSubmit.addEventListener('click', submitTime);
    }
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
    const absContainer = document.getElementById('hr-absence-container');
    
    if (presContainer.dataset.loaded === 'true') return;
    
    presContainer.innerHTML = '<span style="font-size:11px;color:#999;">Chargement...</span>';
    absContainer.innerHTML = '<span style="font-size:11px;color:#999;">Chargement...</span>';
    
    const projectId = profileConfig?.doliHrProject;
    if (!projectId) {
        presContainer.innerHTML = '<span style="font-size:11px;color:#e74c3c;">Projet RH non configuré. Allez dans les options.</span>';
        absContainer.innerHTML = '';
        return;
    }

    const headers = { 'DOLAPIKEY': apiToken, 'Accept': 'application/json' };
    if (doliEntity) headers['DOLAPIENTITY'] = doliEntity;

    try {
        const res = await fetchDoli(`${doliUrl}/tasks?sqlfilters=(t.fk_projet:=:${projectId})&limit=100`, { headers });
        if (res.ok) {
            const tasks = await res.json();
            presContainer.innerHTML = '';
            absContainer.innerHTML = '';
            
            const presIds = profileConfig.doliHrPresenceTasks || [];
            const absIds = profileConfig.doliHrAbsenceTasks || [];
            
            let presFound = false;
            let absFound = false;

            if (Array.isArray(tasks)) {
                tasks.forEach(t => {
                    const idStr = String(t.id);
                    if (presIds.includes(idStr)) {
                        presContainer.appendChild(createHrBtn(t.id, t.label, 'presence'));
                        presFound = true;
                    }
                    if (absIds.includes(idStr)) {
                        absContainer.appendChild(createHrBtn(t.id, t.label, 'absence'));
                        absFound = true;
                    }
                });
            }
            
            if (!presFound) presContainer.innerHTML = '<span style="font-size:11px;color:#999;">Aucune tâche configurée</span>';
            if (!absFound) absContainer.innerHTML = '<span style="font-size:11px;color:#999;">Aucune tâche configurée</span>';
            
            presContainer.dataset.loaded = 'true';
        }
    } catch(e) {
        presContainer.innerHTML = '<span style="font-size:11px;color:#e74c3c;">Erreur</span>';
        absContainer.innerHTML = '';
    }
}

function createHrBtn(taskId, label, type) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = label;
    // Styling
    btn.style.padding = '6px';
    btn.style.fontSize = '12px';
    btn.style.borderRadius = '4px';
    btn.style.border = '1px solid ' + (type === 'presence' ? '#2ecc71' : '#f39c12');
    btn.style.background = 'white';
    btn.style.color = '#333';
    btn.style.cursor = 'pointer';
    btn.style.textAlign = 'left';
    btn.style.transition = 'all 0.2s';
    
    btn.className = 'hr-task-btn';
    btn.dataset.taskId = taskId;
    btn.dataset.label = label;
    btn.dataset.type = type;

    btn.addEventListener('click', () => {
        document.querySelectorAll('.hr-task-btn').forEach(b => {
            b.style.background = 'white';
            b.style.color = '#333';
        });
        btn.style.background = type === 'presence' ? '#2ecc71' : '#f39c12';
        btn.style.color = 'white';
        
        selectedHrTask = taskId;
        const labelEl = document.getElementById('time-hr-selected-label');
        if(labelEl) labelEl.textContent = `Sélectionné : ${label}`;
        
        checkSubmitStatus();
    });

    return btn;
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
