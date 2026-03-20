const fs = require('fs');
const path = require('path');
const file = path.join('c:', 'Users', 'laure', 'OneDrive', 'developpement', 'Doli-ReedCRM', 'content.js');
const code = fs.readFileSync(file, 'utf8');
const lines = code.split('\n');

const newCode = `function injectOutlookReadButton() {
    if (!window.location.href.includes('outlook.live.com') && !window.location.href.includes('outlook.office.com') && !window.location.href.includes('outlook.office365.com')) return;

    // Chercher le bouton Répondre dans la vue de lecture d'un message
    const replyBtns = document.querySelectorAll('button[aria-label="Répondre"], button[name="Reply"], button[data-icon-name="Reply"]');
    
    let toolbar = null;
    let targetElement = null;
    
    // On cherche la barre d'outils d'en-tête du message ouvert
    for (let i = replyBtns.length - 1; i >= 0; i--) {
        const btn = replyBtns[i];
        let parent = btn.parentElement;
        for (let j = 0; j < 5; j++) {
            if (!parent) break;
            const style = window.getComputedStyle(parent);
            if (parent.className.includes('Toolbar') || parent.getAttribute('role') === 'toolbar' || (style.display === 'flex' && style.flexDirection === 'row')) {
                toolbar = parent;
                targetElement = btn;
                break;
            }
            parent = parent.parentElement;
        }
        if (toolbar) break;
    }

    if (!toolbar) return;
    if (toolbar.querySelector('.doli-outlook-read-btn')) return;

    const doliContainer = document.createElement('div');
    doliContainer.className = 'doli-outlook-read-btn doli-dropdown-container';
    
    doliContainer.style.position = 'relative';
    doliContainer.style.display = 'inline-flex';
    doliContainer.style.alignItems = 'center';
    doliContainer.style.marginRight = '8px';
    doliContainer.style.zIndex = '50';

    const mainBtn = document.createElement('button');
    mainBtn.style.display = 'inline-flex';
    mainBtn.style.alignItems = 'center';
    mainBtn.style.justifyContent = 'space-between';
    mainBtn.style.padding = '0 10px';
    mainBtn.style.width = '95px'; 
    mainBtn.style.flexShrink = '0';
    mainBtn.style.backgroundColor = '#084B54'; 
    mainBtn.style.color = '#ffffff'; 
    mainBtn.style.borderRadius = '10px'; 
    mainBtn.style.border = 'none';
    mainBtn.style.fontWeight = '600';
    mainBtn.style.fontSize = '11px';
    mainBtn.style.cursor = 'pointer';
    mainBtn.style.height = '24px'; 
    mainBtn.style.minHeight = '24px'; 
    mainBtn.style.whiteSpace = 'nowrap';
    mainBtn.title = "Actions ReedCRM";
    
    mainBtn.addEventListener('mouseenter', () => mainBtn.style.opacity = '0.9');
    mainBtn.addEventListener('mouseleave', () => mainBtn.style.opacity = '1');
    mainBtn.innerHTML = \`<span style="color: #ffffff;">ReedCRM</span><span style="color: #ffffff; font-size: 8px; margin-top: 1px;">▼</span>\`;

    const dropdown = document.createElement('div');
    dropdown.className = 'doli-dropdown-menu';
    dropdown.style.display = 'none';
    dropdown.style.position = 'absolute';
    dropdown.style.top = '100%';
    dropdown.style.right = '0';
    dropdown.style.backgroundColor = 'white';
    dropdown.style.border = '1px solid #ddd';
    dropdown.style.borderRadius = '4px';
    dropdown.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
    dropdown.style.padding = '4px';
    dropdown.style.flexDirection = 'column';
    dropdown.style.gap = '4px';
    dropdown.style.marginTop = '4px';
    
    const actionStyle = \`
        padding: 8px 12px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        border-radius: 4px;
        font-size: 13px;
        color: #333;
        white-space: nowrap;
        transition: background-color 0.2s;
    \`;

    const oppAction = document.createElement('div');
    oppAction.style.cssText = actionStyle;
    oppAction.title = 'Créer une Opportunité depuis ce mail';
    oppAction.innerHTML = \`<svg fill="#6c757d" width="16" height="16" viewBox="0 0 24 24"><path d="M18,16.08C17.24,16.08 16.56,16.38 16.04,16.85L8.91,12.7C8.96,12.47 9,12.24 9,12C9,11.76 8.96,11.53 8.91,11.3L15.96,7.19C16.5,7.69 17.21,8 18,8A3,3 0 0,0 21,5A3,3 0 0,0 18,2A3,3 0 0,0 15,5C15,5.24 15.04,5.47 15.09,5.7L8.04,9.81C7.5,9.31 6.79,9 6,9A3,3 0 0,0 3,12A3,3 0 0,0 6,15C6.79,15 7.5,14.69 8.04,14.19L15.16,18.34C15.11,18.55 15.08,18.77 15.08,19C15.08,20.61 16.39,21.92 18,21.92C19.61,21.92 20.92,20.61 20.92,19C20.92,17.39 19.61,16.08 18,16.08Z" /></svg> Opportunité\`;
    oppAction.addEventListener('mouseenter', () => oppAction.style.backgroundColor = '#f1f5f9');
    oppAction.addEventListener('mouseleave', () => oppAction.style.backgroundColor = 'transparent');
    
    const handleOpp = (e) => {
        e.preventDefault(); e.stopPropagation(); dropdown.style.display = 'none';
        extractAndOpenOutlookReadEntity('opportunite');
    };
    oppAction.addEventListener('mousedown', handleOpp);
    oppAction.addEventListener('click', handleOpp);

    const ticketAction = document.createElement('div');
    ticketAction.style.cssText = actionStyle;
    ticketAction.title = 'Créer un Ticket depuis ce mail';
    ticketAction.innerHTML = \`<svg fill="#38b2ac" width="16" height="16" viewBox="0 0 24 24"><path d="M22,10V6A2,2 0 0,0 20,4H4A2,2 0 0,0 2,6V10C3.11,10 4,10.9 4,12C4,13.11 3.11,14 2,14V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V14C20.89,14 20,13.11 20,12C20,10.9 20.89,10 22,10M11,15H13V13H15V11H13V9H11V11H9V13H11V15Z"></path></svg> Ticket\`;
    ticketAction.addEventListener('mouseenter', () => ticketAction.style.backgroundColor = '#f1f5f9');
    ticketAction.addEventListener('mouseleave', () => ticketAction.style.backgroundColor = 'transparent');
    
    const handleTicket = (e) => {
        e.preventDefault(); e.stopPropagation(); dropdown.style.display = 'none';
        extractAndOpenOutlookReadEntity('ticket');
    };
    ticketAction.addEventListener('mousedown', handleTicket);
    ticketAction.addEventListener('click', handleTicket);

    const handleMain = (e) => {
        e.preventDefault(); e.stopPropagation();
        document.querySelectorAll('.doli-dropdown-menu').forEach(el => {
            if (el !== dropdown) el.style.display = 'none';
        });
        dropdown.style.display = dropdown.style.display === 'none' ? 'flex' : 'none';
    };
    mainBtn.addEventListener('mousedown', handleMain);
    mainBtn.addEventListener('click', handleMain);
    
    document.addEventListener('click', (e) => {
        if (!doliContainer.contains(e.target)) dropdown.style.display = 'none';
    });

    dropdown.appendChild(oppAction);
    dropdown.appendChild(ticketAction);
    doliContainer.appendChild(mainBtn);
    doliContainer.appendChild(dropdown);

    // Insertion juste avant le bouton cible
    toolbar.insertBefore(doliContainer, targetElement || toolbar.firstChild);
}

function extractAndOpenOutlookReadEntity(activeTab) {
    let subject = "";
    let message = "";

    // Le sujet global est souvent en title ou dans les divs en lecture
    if (document.title) {
        subject = document.title.split(' - ')[0];
    }
    
    const bodyElement = document.querySelector('div[aria-label="Corps du message"], div[aria-label="Message body"]');
    if (bodyElement) {
        message = bodyElement.innerText.substring(0, 500);
    } else {
        message = "Corps de l'e-mail non lisible directement.";
    }

    const defaultSubject = activeTab === 'opportunite' ? 'Nouvelle opp. Outlook' : 'Nouveau ticket Outlook';

    chrome.storage.local.set({ 
        doliActiveTab: activeTab,
        doliPrefillSubject: subject || defaultSubject,
        doliPrefillMessage: message
    }, () => {
        chrome.runtime.sendMessage({ action: "OPEN_EXTENSION_POPUP" });
    });
}`;

// Splice lines: keep 0-1044, inject newCode, keep 1249 to end
const finalCode = lines.slice(0, 1045).join('\n') + '\n\n' + newCode + '\n\n' + lines.slice(1249).join('\n');

fs.writeFileSync(file, finalCode);
console.log('Patched content.js');
