export const triggerCapture = async (btnElement, statusElementId, { ticketSubject, ticketMessage, oppSubject, oppMessage, oppAssignee, ticketAssignee, isOppActive, oppNom, oppPrenom, oppTel, oppEmail, oppProba, oppMontant, ticketTiers, ticketContact, ticketProject, ticketFilesList, oppFilesList }) => {
    try {
        btnElement.textContent = chrome.i18n.getMessage('popup_js_128');
        btnElement.disabled = true;
        const statusMessage = document.getElementById(statusElementId);
        if (statusMessage) { statusMessage.textContent = ""; }

        // --- Sauvegarde des champs du formulaire avant fermeture du popup ---
        let storageData = {
            doliPrefillSubject: isOppActive ? (oppSubject || '') : (ticketSubject || ''),
            doliPrefillMessage: isOppActive ? (oppMessage || '') : (ticketMessage || ''),
            doliPrefillAssignee: isOppActive ? (oppAssignee || '') : (ticketAssignee || ''),
            doliActiveTab: isOppActive ? 'opportunite' : 'ticket'
        };

        if (isOppActive) {
            storageData.doliPrefillOppNom = oppNom || '';
            storageData.doliPrefillOppPrenom = oppPrenom || '';
            storageData.doliPrefillOppTel = oppTel || '';
            storageData.doliPrefillOppEmail = oppEmail || '';
            storageData.doliPrefillOppProba = oppProba || '50';
            storageData.doliPrefillOppMontant = oppMontant || '';
        }

        // Sauvegarde globale des 3 listes déroulantes (valable pour Ticket et Opp)
        if (ticketTiers !== undefined) storageData.doliPrefillTicketTiers = ticketTiers || '';
        if (ticketContact !== undefined) storageData.doliPrefillTicketContact = ticketContact || '';
        if (ticketProject !== undefined) storageData.doliPrefillTicketProject = ticketProject || '';

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

        storageData.doliPendingTicketFiles = await serializeFiles(ticketFilesList || []);
        storageData.doliPendingOppFiles = await serializeFiles(oppFilesList || []);

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
                                errorKey = 'error_capture_timeout';
                            } else if (specificError === "FORBIDDEN_URL") {
                                errorKey = 'error_capture_forbidden';
                            } else if (specificError.includes("Receiving end does not exist")) {
                                errorKey = 'error_capture_refresh';
                            }

                            if (errorKey === 'error_capture_forbidden') {
                                statusMessage.textContent = chrome.i18n.getMessage('error_capture_forbidden');
                                statusMessage.appendChild(document.createElement('br'));
                                
                                let helpLink = document.createElement('a');
                                helpLink.href = "#";
                                helpLink.style.textDecoration = "underline";
                                helpLink.style.color = "#e74c3c";
                                helpLink.style.cursor = "help";
                                helpLink.style.fontSize = "0.9em";
                                helpLink.textContent = chrome.i18n.getMessage('error_capture_forbidden_link') || "(Voir les pages interdites)";
                                helpLink.title = chrome.i18n.getMessage('error_capture_forbidden_hover') || "Pages interdites";
                                statusMessage.appendChild(helpLink);
                            } else {
                                if (typeof ErrorManager !== 'undefined') {
                                    statusMessage.textContent = ErrorManager.getMessage(errorKey, specificError);
                                } else {
                                    statusMessage.textContent = "Erreur de capture : " + specificError;
                                }
                                statusMessage.title = "";
                            }
                            
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

export function resetCaptureButton(btn) {
    btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px; vertical-align: text-bottom;"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg> Capturer';
    btn.disabled = false;
}
