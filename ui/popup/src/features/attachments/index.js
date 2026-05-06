import { attachmentsState } from './state.js';
import { renderThumbnails } from './gallery.js';
import { triggerCapture } from './capture.js';

export function initAttachments() {
    const fileInput = document.getElementById('ticket-file');
    const oppFileInput = document.getElementById('opp-file');
    const tabOpportunite = document.getElementById('tab-opportunite');

    // --- Gestion du collage d'image (Presse-papier) ---
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

                    if (tabOpportunite && tabOpportunite.classList.contains('active')) {
                        attachmentsState.oppFiles.push(fileObj);
                        renderThumbnails(attachmentsState.oppFiles, 'opp-preview-container', 'opp-file');
                    } else {
                        attachmentsState.ticketFiles.push(fileObj);
                        renderThumbnails(attachmentsState.ticketFiles, 'preview-container', 'ticket-file');
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
                attachmentsState.ticketFiles.push({ file: f, previewUrl });
            });
            renderThumbnails(attachmentsState.ticketFiles, 'preview-container', 'ticket-file');
        });
    }

    if (oppFileInput) {
        oppFileInput.addEventListener('change', () => {
            Array.from(oppFileInput.files).forEach(f => {
                const previewUrl = f.type.startsWith('image/') ? URL.createObjectURL(f) : '';
                attachmentsState.oppFiles.push({ file: f, previewUrl });
            });
            renderThumbnails(attachmentsState.oppFiles, 'opp-preview-container', 'opp-file');
        });
    }

    // --- Gestion du bouton "Capturer l'écran" ---
    const btnCaptureScreen = document.getElementById('btn-capture-screen');
    const oppBtnCaptureScreen = document.getElementById('opp-btn-capture-screen');

    const getCaptureContext = () => {
        const isOppActive = tabOpportunite && tabOpportunite.classList.contains('active');
        const oppAssigneeSelect = document.getElementById('opp-assignee');
        const assigneeSelect = document.getElementById('ticket-assignee');
        return {
            ticketSubject: document.getElementById('ticket-subject')?.value,
            ticketMessage: document.getElementById('ticket-message')?.value,
            oppSubject: document.getElementById('opp-subject')?.value,
            oppMessage: document.getElementById('opp-message')?.value,
            oppAssignee: oppAssigneeSelect ? oppAssigneeSelect.value : '',
            ticketAssignee: assigneeSelect ? assigneeSelect.value : '',
            isOppActive,
            oppNom: document.getElementById('opp-nom')?.value,
            oppPrenom: document.getElementById('opp-prenom')?.value,
            oppTel: document.getElementById('opp-tel')?.value,
            oppEmail: document.getElementById('opp-email')?.value,
            oppProba: document.getElementById('opp-proba')?.value,
            oppMontant: document.getElementById('opp-montant')?.value,
            ticketTiers: document.getElementById('ticket-tiers')?.value,
            ticketContact: document.getElementById('ticket-contact')?.value,
            ticketProject: document.getElementById('ticket-project')?.value,
            ticketFilesList: attachmentsState.ticketFiles,
            oppFilesList: attachmentsState.oppFiles
        };
    };

    if (btnCaptureScreen) {
        btnCaptureScreen.addEventListener('click', () => triggerCapture(btnCaptureScreen, 'status-message', getCaptureContext()));
    }
    if (oppBtnCaptureScreen) {
        oppBtnCaptureScreen.addEventListener('click', () => triggerCapture(oppBtnCaptureScreen, 'opp-status-message', getCaptureContext()));
    }

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

        restoreFiles(result.doliPendingTicketFiles, attachmentsState.ticketFiles, 'preview-container', 'ticket-file');
        restoreFiles(result.doliPendingOppFiles, attachmentsState.oppFiles, 'opp-preview-container', 'opp-file');
        
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
                        attachmentsState.oppFiles.push(fileObj);
                        renderThumbnails(attachmentsState.oppFiles, 'opp-preview-container', 'opp-file');
                    } else {
                        attachmentsState.ticketFiles.push(fileObj);
                        renderThumbnails(attachmentsState.ticketFiles, 'preview-container', 'ticket-file');
                    }
                });
        }
    });
}
