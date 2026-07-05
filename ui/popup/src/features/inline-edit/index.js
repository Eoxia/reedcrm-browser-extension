import { fetchDoli } from '../../api/dolibarr.js';

export function initInlineEdit() {
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
            if (editable.querySelector('input') || editable.querySelector('select') || editable.querySelector('textarea')) return;
            
            e.preventDefault();
            e.stopPropagation();
            
            let currentValue = editable.getAttribute('data-val') || '';
            const projectId = editable.getAttribute('data-pid');
            const fieldName = editable.getAttribute('data-field');
            
            if (fieldName === 'opp_percent' && currentValue !== '') {
                currentValue = Math.round(parseFloat(currentValue)).toString();
            }
            
            let input;
            if (fieldName === 'fk_statut' || fieldName === 'severity_code' || fieldName === 'fk_user_assign' || fieldName === 'commercial_id') {
                input = document.createElement('select');
                input.id = 'inline_edit_' + fieldName + '_' + projectId;
                input.className = 'inline-edit-input inline-edit-select';
                
                if (fieldName === 'commercial_id') {
                    input.style.position = 'absolute';
                    input.style.left = '0';
                    input.style.top = '-2px';
                    input.style.minWidth = '80px';
                    input.style.maxWidth = '120px';
                    input.style.zIndex = '100';
                    editable.style.position = 'relative';
                }
                
                if (fieldName === 'fk_statut') {
                    const statuses = {
                        "0": "Non lu",
                        "1": "Lu",
                        "2": "Assigné",
                        "3": "En cours",
                        "4": "En attente de retour",
                        "5": "En attente",
                        "8": "Fermé (Résolu)",
                        "9": "Annulé"
                    };
                    for (const [val, label] of Object.entries(statuses)) {
                        const opt = document.createElement('option');
                        opt.value = val;
                        opt.textContent = label.length > 15 ? label.substring(0, 15) + '..' : label;
                        if (String(val) === String(currentValue)) opt.selected = true;
                        input.appendChild(opt);
                    }
                } else if (fieldName === 'severity_code') {
                    const severities = {
                        "LOW": "Basse",
                        "NORMAL": "Normale",
                        "HIGH": "Haute",
                        "BLOCKING": "Bloquante"
                    };
                    for (const [val, label] of Object.entries(severities)) {
                        const opt = document.createElement('option');
                        opt.value = val;
                        opt.textContent = label.length > 15 ? label.substring(0, 15) + '..' : label;
                        if (String(val) === String(currentValue)) opt.selected = true;
                        input.appendChild(opt);
                    }
                } else if (fieldName === 'fk_user_assign' || fieldName === 'commercial_id') {
                    const optEmpty = document.createElement('option');
                    optEmpty.value = "";
                    optEmpty.textContent = "Non assigné";
                    input.appendChild(optEmpty);
                    if (window.usersList && window.usersList.length > 0) {
                        window.usersList.forEach(u => {
                            const opt = document.createElement('option');
                            opt.value = u.id;
                            let userLabel = (u.firstname || '') + ' ' + (u.lastname || u.login || '');
                            opt.textContent = userLabel.length > 15 ? userLabel.substring(0, 15) + '..' : userLabel;
                            if (String(u.id) === String(currentValue)) opt.selected = true;
                            input.appendChild(opt);
                        });
                    }
                }
            } else if (fieldName === 'message') {
                input = document.createElement('textarea');
                input.id = 'inline_edit_' + fieldName + '_' + projectId;
                input.name = 'inline_edit_' + fieldName;
                input.className = 'inline-edit-input';
                input.value = currentValue;
                input.style.height = '80px';
                input.style.resize = 'vertical';
            } else {
                input = document.createElement('input');
                input.type = 'text';
                input.id = 'inline_edit_' + fieldName + '_' + projectId;
                input.name = 'inline_edit_' + fieldName;
                input.className = 'inline-edit-input';
                input.value = currentValue;
            }
            
            const originalNodes = Array.from(editable.childNodes).map(n => n.cloneNode(true));
            const restoreOriginal = (el) => {
                el.textContent = '';
                originalNodes.forEach(n => el.appendChild(n.cloneNode(true)));
            };
            const originalClass = editable.className;
            
            editable.classList.add('is-editing');
            editable.innerHTML = '';
            editable.appendChild(input);
            input.focus();
            if (input.tagName === 'INPUT') {
                input.select();
            }
            
            let isSaving = false;
            
            const saveEdit = async () => {
                if (isSaving) return;
                isSaving = true;
                
                let newValue = input.value.trim();
                
                const showErrorInline = (msgOrError) => {
                    editable.style.transition = 'color 0.3s ease';
                    editable.style.color = '#ef4444';
                    
                    const errBox = document.createElement('div');
                    errBox.style.marginBottom = '8px';
                    errBox.style.width = '100%';
                    
                    if (typeof DoliError !== 'undefined' && msgOrError instanceof DoliError) {
                        // Utilise l'affichage standard des erreurs
                        if (typeof showDoliError === 'function') {
                            showDoliError(msgOrError, errBox);
                        } else {
                            errBox.innerHTML = msgOrError.toHTML();
                        }
                    } else {
                        // Style personnalisé (fallback pour les strings simples)
                        errBox.style.background = '#fef2f2';
                        errBox.style.color = '#ef4444';
                        errBox.style.border = '1px solid #f87171';
                        errBox.style.padding = '8px 12px';
                        errBox.style.borderRadius = '6px';
                        errBox.style.fontSize = '12px';
                        errBox.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                        errBox.style.display = 'flex';
                        errBox.style.alignItems = 'center';
                        errBox.style.gap = '6px';
                        
                        let textMsg = typeof msgOrError === 'string' ? msgOrError : (msgOrError.message || "Erreur");
                        errBox.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg> <span>${textMsg}</span>`;
                    }
                    
                    const parentItem = editable.closest('.rt-item, .opp-list-item, .ticket-card');
                    if (parentItem && parentItem.parentNode) {
                        parentItem.parentNode.insertBefore(errBox, parentItem);
                    } else {
                        errBox.style.marginTop = '4px';
                        editable.parentNode.insertBefore(errBox, editable.nextSibling);
                    }
                    
                    setTimeout(() => {
                        if (errBox.parentNode) errBox.parentNode.removeChild(errBox);
                        editable.style.color = '';
                        editable.style.transition = '';
                        restoreOriginal(editable);
                        editable.className = originalClass;
                        editable.classList.remove('is-editing');
                    }, 8000); // Increased timeout to 8s for DoliError so user can read details
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
                    const websiteRegex = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)\/?$/i;
                    if (!websiteRegex.test(newValue)) {
                        showErrorInline(chrome.i18n.getMessage('popup_title_43') || "Exemple de domaine valide: monsite.com");
                        return;
                    }
                    if (!newValue.startsWith('http://') && !newValue.startsWith('https://')) {
                        newValue = 'https://' + newValue;
                    }
                }
                
                if ((fieldName === 'opp_percent' || fieldName === 'progress') && newValue !== '') {
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
                    restoreOriginal(editable);
                    editable.className = originalClass;
                    editable.classList.remove('is-editing');
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
                        if (fieldName === 'fk_statut') {
                            payload.statut = parseInt(newValue, 10);
                            payload.status = parseInt(newValue, 10);
                            payload.fk_statut = parseInt(newValue, 10);
                            if (String(newValue) === '8') {
                                payload.progression = 100;
                                payload.progress = 100;
                            }
                        } else if (fieldName === 'progress') {
                            payload.progression = parseInt(newValue, 10);
                        }
                    }
                    
                    if (fieldName === 'commercial_id') {
                        // Ajouter le nouveau commercial SANS supprimer les existants
                        if (newValue && newValue !== '') {
                            const resPost = await fetchDoli(`${apiUrl}/projects/${projectId}/contacts`, {
                                method: 'POST',
                                headers: { 'DOLAPIKEY': token, 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    contactid: parseInt(newValue, 10),
                                    fk_socpeople: parseInt(newValue, 10),
                                    userid: parseInt(newValue, 10),
                                    type: "SALESREPINTERNAL",
                                    type_contact: "SALESREPINTERNAL",
                                    source: "internal"
                                })
                            });
                            if (!resPost.ok) {
                                let techMsg = resPost.statusText;
                                try {
                                    const errJson = await resPost.json();
                                    techMsg = errJson.error?.message || JSON.stringify(errJson);
                                } catch(e) {}
                                
                                // "result :0" = contact déjà affecté, c'est un succès pour nous
                                if (techMsg && typeof techMsg === 'string' && techMsg.includes('result :0')) {
                                    // Déjà affecté, on continue normalement
                                } else {
                                    if (typeof DoliError !== 'undefined') {
                                        throw new DoliError('ReedCRM-5006', techMsg);
                                    } else {
                                        throw new Error("(Erreur 5006) " + (chrome.i18n.getMessage('error_5006') || "Erreur assignation commercial"));
                                    }
                                }
                            }
                        }
                        
                        // Recharger la liste complète des commerciaux depuis l'API pour afficher les noms
                        const userSvg = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:2px;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;
                        try {
                            const resRefresh = await fetchDoli(`${apiUrl}/projects/${projectId}/contacts`, { headers: { 'DOLAPIKEY': token } });
                            if (resRefresh.ok) {
                                const allContacts = await resRefresh.json();
                                const comms = allContacts.filter(c => {
                                    const codeVal = (c.code || c.type_code || c.type || '').toUpperCase();
                                    return codeVal === 'SALESREP' || codeVal === 'SALESREPINTERNAL';
                                });
                                // Mettre à jour tous les badges de ce projet
                                const allBadges = document.querySelectorAll(`.user-commercial-select[data-pid="${projectId}"]`);
                                allBadges.forEach(b => {
                                    if (comms.length > 0) {
                                        const initials = [];
                                        const names = [];
                                        for (const c of comms) {
                                            const uid = c.fk_user || c.userid || c.user_id || c.fk_socpeople || c.id;
                                            if (window.usersList && Array.isArray(window.usersList)) {
                                                const u = window.usersList.find(user => String(user.id) === String(uid));
                                                if (u) {
                                                    const parts = [u.firstname, u.lastname].filter(Boolean);
                                                    names.push(parts.join(' ') || u.login);
                                                    if (parts.length >= 2) initials.push(parts[0].charAt(0).toUpperCase() + parts[1].charAt(0).toUpperCase());
                                                    else if (parts.length === 1) initials.push(parts[0].substring(0, 2).toUpperCase());
                                                    else if (u.login) initials.push(u.login.substring(0, 2).toUpperCase());
                                                    continue;
                                                }
                                            }
                                            const fallback = ((c.firstname || '') + ' ' + (c.lastname || '')).trim();
                                            names.push(fallback || '?' + uid);
                                            initials.push(fallback ? fallback.substring(0, 2).toUpperCase() : '?' + uid);
                                        }
                                        b.innerHTML = userSvg + initials.join(', ');
                                        b.title = chrome.i18n.getMessage('commercial_assigned', names.join(', ')) || `Commerciaux: ${names.join(', ')}`;
                                        b.dataset.val = comms.map(c => c.fk_user || c.userid || c.user_id || c.fk_socpeople || c.id).join(',');
                                    } else {
                                        b.innerHTML = userSvg + (chrome.i18n.getMessage('commercial_none') || 'C-??');
                                        b.title = chrome.i18n.getMessage('commercial_assign') || 'Assigner un commercial';
                                        b.dataset.val = '';
                                    }
                                });
                            }
                        } catch(e) { console.warn("Erreur rechargement contacts", e); }
                        
                        editable.className = originalClass;
                        editable.classList.remove('is-editing');
                        
                        // Animation : passage au vert puis retour à la normale
                        editable.style.transition = 'color 0.5s ease-out';
                        editable.style.color = '#10b981';
                        setTimeout(() => {
                            editable.style.color = '';
                            setTimeout(() => {
                                editable.style.transition = '';
                            }, 500);
                        }, 1000);
                        
                        return;
                    }

                    let endpointUrl = `${apiUrl}/projects/${projectId}`;
                    if (['fk_statut', 'severity_code', 'progress', 'fk_user_assign', 'subject', 'message'].includes(fieldName)) {
                        endpointUrl = `${apiUrl}/tickets/${projectId}`;
                    }
                    
                    const res = await fetchDoli(endpointUrl, {
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
                        if (input.tagName === 'SELECT') {
                            const selOpt = input.options[input.selectedIndex];
                            displayValue = selOpt ? selOpt.text : newValue;
                        }
    
                        if (fieldName === 'fk_statut') {
                            restoreOriginal(editable);
                            const label = editable.querySelector('.tc-status-label');
                            if (label) label.textContent = displayValue;
                            const dot = editable.querySelector('.tc-status-dot');
                            if (dot) {
                                let statusColor = "#95a5a6";
                                const stat = String(newValue);
                                if (stat === "0") statusColor = "#e74c3c";
                                else if (stat === "1") statusColor = "#3498db";
                                else if (["2", "3", "4", "5", "6", "7"].includes(stat)) statusColor = "#f39c12";
                                else if (stat === "8") statusColor = "#27ae60";
                                else if (stat === "9") statusColor = "#7f8c8d";
                                dot.style.backgroundColor = statusColor;
                            }
                            
                            // Met à jour la progression à 100% si on clôture le ticket
                            if (String(newValue) === '8') {
                                const ticketCard = editable.closest('.recent-ticket-item');
                                if (ticketCard) {
                                    const progressEl = ticketCard.querySelector('[data-field="progress"]');
                                    if (progressEl) {
                                        progressEl.setAttribute('data-val', '100');
                                        progressEl.textContent = '100%';
                                    }
                                }
                            }
                        } else if (fieldName === 'fk_user_assign') {
                            if (!newValue) {
                                editable.textContent = '?';
                            } else {
                                const matchedUser = window.usersList ? window.usersList.find(u => String(u.id) === String(newValue)) : null;
                                const parts = displayValue.split(' ');
                                let initials = parts.length > 1 ? parts[0].charAt(0).toUpperCase() + parts[1].charAt(0).toUpperCase() : displayValue.substring(0, 2).toUpperCase();
                                if (matchedUser && matchedUser.photo && matchedUser.photo.trim() !== '') {
                                    const img = document.createElement('img');
                                    let photoUrl = matchedUser.photo.trim();
                                    if (!photoUrl.startsWith('http') && !photoUrl.startsWith('//')) {
                                        photoUrl = `${apiUrl.replace('/api/index.php', '')}/document.php?modulepart=user&file=${encodeURIComponent(photoUrl)}`;
                                    }
                                    img.src = photoUrl;
                                    img.alt = initials;
                                    img.onerror = () => {
                                        editable.textContent = initials;
                                    };
                                    editable.textContent = '';
                                    editable.appendChild(img);
                                } else {
                                    editable.textContent = initials;
                                }
                            }
                        } else if (fieldName === 'commercial_id') {
                            const users = window.usersList || [];
                            const matchedUser = users.find(u => String(u.id) === String(newValue));
                            if (matchedUser) {
                                let initials = (matchedUser.firstname ? matchedUser.firstname.charAt(0) : '') + 
                                               (matchedUser.lastname ? matchedUser.lastname.charAt(0) : '');
                                displayValue = initials.toUpperCase() || '...';
                            } else {
                                displayValue = '...';
                            }
                            editable.dataset.val = newValue;
                        } else if (fieldName === 'severity_code') {
                            editable.textContent = displayValue;
                        } else if (fieldName === 'progress') {
                            editable.textContent = newValue + '%';
                        } else {
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
                                    if (editable.tagName === 'A') {
                                        let safeHref = '#';
                                        try {
                                            const parsedUrl = new URL(newValue, window.location.origin);
                                            if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') {
                                                safeHref = parsedUrl.href;
                                            }
                                        } catch (e) {}
                                        editable.setAttribute('href', safeHref);
                                    }
                                }
                            }
                            
                            let iconNode = null;
                            for (const n of originalNodes) {
                                if (n.nodeName === 'I') { iconNode = n.cloneNode(true); break; }
                                if (n.querySelector && n.querySelector('i')) { iconNode = n.querySelector('i').cloneNode(true); break; }
                            }
                            
                            editable.textContent = '';
                            if (iconNode) {
                                editable.appendChild(iconNode);
                                editable.appendChild(document.createTextNode(' ' + displayValue));
                            } else {
                                editable.textContent = displayValue;
                            }
                        }
                        
                        const contactLine = editable.closest('.rt-contact-line');
                        if (contactLine) {
                            let targetBtn = null;
                            if (fieldName === 'options_projectphone') targetBtn = contactLine.querySelector('[data-copy-target="tel"]');
                            if (fieldName === 'options_reedcrm_email') targetBtn = contactLine.querySelector('[data-copy-target="email"]');
                            if (targetBtn) targetBtn.setAttribute('data-copy', newValue);
                            
                            if (fieldName === 'options_reedcrm_website') {
                                const linkEl = contactLine.querySelector('.rt-contact-link');
                                if (newValue) {
                                    let href = newValue.startsWith('http') ? newValue : 'https://' + newValue;
                                    try {
                                        const parsed = new URL(href);
                                        href = (parsed.protocol === 'http:' || parsed.protocol === 'https:') ? parsed.href : '#';
                                    } catch(e) { href = '#'; }
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
                    if (typeof DoliError !== 'undefined' && err instanceof DoliError) {
                        showErrorInline(err);
                    } else {
                        showErrorInline((chrome.i18n.getMessage('popup_js_err_save') || "Erreur de sauvegarde : ") + err.message);
                    }
                } finally {
                    // We shouldn't remove is-editing immediately if showErrorInline is displaying the error
                    if (!editable.style.color) {
                        editable.classList.remove('is-editing');
                    }
                }
            };
            
            if (input.tagName === 'SELECT') {
                input.addEventListener('change', saveEdit);
                const outsideClickListener = (evt) => {
                    if (!editable.contains(evt.target)) {
                        document.removeEventListener('click', outsideClickListener);
                        if (editable.classList.contains('is-editing') && !isSaving) {
                            restoreOriginal(editable);
                            editable.className = originalClass;
                            editable.classList.remove('is-editing');
                        }
                    }
                };
                setTimeout(() => document.addEventListener('click', outsideClickListener), 100);
            } else {
                input.addEventListener('blur', saveEdit);
            }
            input.addEventListener('keydown', (evt) => {
                if (evt.key === 'Enter') {
                    if (input.tagName === 'TEXTAREA') {
                        if (evt.ctrlKey || evt.metaKey) saveEdit();
                        // Sinon on laisse faire le saut de ligne natif
                    } else {
                        saveEdit();
                    }
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
                    restoreOriginal(editable);
                    editable.className = originalClass;
                    editable.classList.remove('is-editing');
                }
            });
        }
    });
    
}
