// content.js - Script injecté dans les pages web visitées
console.log("Script de contenu Doli-ReedCRM chargé sur la page actuelle.");

// --- Éditeur de Capture d'Écran In-Page ---

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "START_IN_PAGE_EDITOR") {
        initEditor(request.image);
        sendResponse({ status: "started" });
    }
});

let editorOverlay = null;
let canvas = null;
let ctx = null;
let img = null;
let currentMode = 'crop'; // 'crop', 'arrow', 'text'
let isDrawing = false;
let startX = 0, startY = 0;
let snapshot = null; // Pour restaurer l'état du canvas pendant le glissement d'une flèche
let cropSelectionDiv = null;
let userBlurIntensity = 8; // Réglage global
let userImageFormat = 'png'; // Réglage global
let sequenceCounter = 1;

function initEditor(dataUrl) {
    chrome.storage.sync.get(['doliBlurIntensity', 'doliImageFormat'], (items) => {
        if (items.doliBlurIntensity) userBlurIntensity = items.doliBlurIntensity;
        if (items.doliImageFormat) userImageFormat = items.doliImageFormat;
    });

    if (editorOverlay) {
        document.body.removeChild(editorOverlay);
    }

    // 1. Création de l'interface
    editorOverlay = document.createElement('div');
    editorOverlay.id = 'doli-editor-overlay';

    editorOverlay.innerHTML = `
        <div id="doli-editor-toolbar">
            <button class="doli-tool-btn active" data-mode="crop">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2v14a2 2 0 0 0 2 2h14"></path><path d="M18 22V8a2 2 0 0 0-2-2H2"></path></svg>
                Recadrer
            </button>
            <button class="doli-tool-btn" data-mode="arrow">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline></svg>
                Flèche
            </button>
            <button class="doli-tool-btn" data-mode="text">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 7 4 4 20 4 20 7"></polyline><line x1="9" y1="20" x2="15" y2="20"></line><line x1="12" y1="4" x2="12" y2="20"></line></svg>
                Texte
            </button>
            <button class="doli-tool-btn" data-mode="rect">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>
                Cadre
            </button>
            <button class="doli-tool-btn" data-mode="blur">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                Flouter
            </button>
            <button class="doli-tool-btn" data-mode="sequence">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><text x="12" y="16" font-family="Arial" font-size="12" font-weight="bold" text-anchor="middle" fill="currentColor" stroke="none">1</text></svg>
                Puce
            </button>
            <div style="width: 20px;"></div>
            <button class="doli-tool-btn" id="doli-btn-settings" title="Ouvrir les réglages">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
            </button>
            <button class="doli-tool-btn danger" id="doli-btn-cancel">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                Annuler
            </button>
            <button class="doli-tool-btn success" id="doli-btn-validate">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                Valider
            </button>
        </div>
        <div id="doli-editor-canvas-container">
            <canvas id="doli-editor-canvas"></canvas>
            <div id="doli-crop-selection" style="display: none;"></div>
        </div>
    `;

    document.body.appendChild(editorOverlay);

    canvas = document.getElementById('doli-editor-canvas');
    ctx = canvas.getContext('2d');
    cropSelectionDiv = document.getElementById('doli-crop-selection');

    // 2. Chargement de l'image sur le canvas
    img = new Image();
    img.onload = () => {
        // Le canvas prend la vraie résolution de l'image (physique, ex: 2x en Retina)
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        // CSS laisse img s'étirer via "width: 100vw; height: 100vh;" et "object-fit: fill"
        
        // Facteurs pour passer des pixels logiques CSS (souris) aux pixels physiques (canvas interne)
        canvas.scaleX = img.width / window.innerWidth;
        canvas.scaleY = img.height / window.innerHeight;
    };
    img.src = dataUrl;

    // 3. Événements des boutons de la barre d'outils
    const toolBtns = editorOverlay.querySelectorAll('.doli-tool-btn[data-mode]');
    
    // Bouton de Paramètres
    document.getElementById('doli-btn-settings').addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: "OPEN_OPTIONS_PAGE" });
    });
    
    toolBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            toolBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentMode = btn.getAttribute('data-mode');
            
            if (currentMode === 'text') {
                canvas.style.cursor = 'text';
            } else {
                canvas.style.cursor = 'crosshair';
            }
            
            // Réinitialise le compteur quand on sélectionne (ou re-sélectionne) l'outil Puce
            if (currentMode === 'sequence') {
                sequenceCounter = 1;
            }
        });
    });

    document.getElementById('doli-btn-cancel').addEventListener('click', closeEditor);
    document.getElementById('doli-btn-validate').addEventListener('click', saveAndClose);

    // 4. Événements de la souris sur le canvas
    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
}

function getMousePos(evt) {
    const rect = canvas.getBoundingClientRect();
    const logicalX = evt.clientX - rect.left;
    const logicalY = evt.clientY - rect.top;
    return {
        // Coordonnées logiques CSS (pour dessiner les div HTML par-dessus)
        logicalX: logicalX,
        logicalY: logicalY,
        // Coordonnées internes au Canvas (pour dessiner dessus et cropper)
        x: logicalX * canvas.scaleX,
        y: logicalY * canvas.scaleY
    };
}

let logicalStartX = 0, logicalStartY = 0; // Coordonnées vue CSS

function onMouseDown(e) {
    if (e.target.id === 'doli-floating-text-input') return; // Ne pas interférer avec le texte en cours de frappe

    if (currentMode === 'text') {
        e.preventDefault(); // Empêche le navigateur de refuser le focus
        const pos = getMousePos(e);
        addTextInput(pos.x, pos.y, e.clientX, e.clientY);
        return;
    }

    isDrawing = true;
    const pos = getMousePos(e);
    startX = pos.x;
    startY = pos.y;
    logicalStartX = pos.logicalX;
    logicalStartY = pos.logicalY;

    if (currentMode === 'arrow' || currentMode === 'rect' || currentMode === 'blur' || currentMode === 'sequence') {
        try {
            snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
        } catch (e) {
            console.error("Erreur getImageData sur snapshot:", e);
            // Fallback pour ne pas crasher si le canvas est invalide/tainted (bien que rare en extension)
            snapshot = ctx.createImageData(Math.max(1, canvas.width), Math.max(1, canvas.height));
        }
        
        // Dessiner la puce immédiatement pour avoir un retour visuel sans glisser
        if (currentMode === 'sequence') {
            drawSequenceCircle(ctx, startX, startY, sequenceCounter);
        }
    } else if (currentMode === 'crop') {
        const rect = canvas.getBoundingClientRect();
        // Div position en pixels logiques
        cropSelectionDiv.style.left = (rect.left + logicalStartX) + 'px';
        cropSelectionDiv.style.top = (rect.top + logicalStartY) + 'px';
        cropSelectionDiv.style.width = '0px';
        cropSelectionDiv.style.height = '0px';
        cropSelectionDiv.style.display = 'block';
    }
}

function onMouseMove(e) {
    if (!isDrawing) return;
    const pos = getMousePos(e);

    if (currentMode === 'arrow') {
        // Restaure l'état avant le début du trait
        ctx.putImageData(snapshot, 0, 0);
        drawArrow(ctx, startX, startY, pos.x, pos.y);
    } else if (currentMode === 'rect') {
        ctx.putImageData(snapshot, 0, 0);
        drawRect(ctx, startX, startY, pos.x, pos.y);
    } else if (currentMode === 'blur') {
        ctx.putImageData(snapshot, 0, 0);
        
        // Prévisualisation de la zone de flou géométrique (grisé translucide)
        ctx.fillStyle = 'rgba(100, 100, 100, 0.5)';
        const w = pos.x - startX;
        const h = pos.y - startY;
        ctx.fillRect(startX, startY, w, h);
    } else if (currentMode === 'sequence') {
        ctx.putImageData(snapshot, 0, 0);
        const dx = pos.x - startX;
        const dy = pos.y - startY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Si on a glissé suffisament loin, on dessine une flèche
        if (distance > 20) {
            drawArrow(ctx, startX, startY, pos.x, pos.y);
        }
        // Puis le cercle par-dessus le point d'origine
        drawSequenceCircle(ctx, startX, startY, sequenceCounter);
    } else if (currentMode === 'crop') {
        const currentClientX = Math.max(0, Math.min(e.clientX, window.innerWidth));
        const currentClientY = Math.max(0, Math.min(e.clientY, window.innerHeight));
        
        const rectCanvas = canvas.getBoundingClientRect();
        
        const absStartX = rectCanvas.left + logicalStartX;
        const absStartY = rectCanvas.top + logicalStartY;

        const x = Math.min(currentClientX, absStartX);
        const y = Math.min(currentClientY, absStartY);
        const w = Math.abs(currentClientX - absStartX);
        const h = Math.abs(currentClientY - absStartY);

        cropSelectionDiv.style.left = x + 'px';
        cropSelectionDiv.style.top = y + 'px';
        cropSelectionDiv.style.width = w + 'px';
        cropSelectionDiv.style.height = h + 'px';
    }
}

function onMouseUp(e) {
    if (!isDrawing) return;
    isDrawing = false;
    const pos = getMousePos(e);

    if (currentMode === 'arrow') {
        ctx.putImageData(snapshot, 0, 0);
        drawArrow(ctx, startX, startY, pos.x, pos.y);
    } else if (currentMode === 'rect') {
        ctx.putImageData(snapshot, 0, 0);
        drawRect(ctx, startX, startY, pos.x, pos.y);
    } else if (currentMode === 'blur') {
        ctx.putImageData(snapshot, 0, 0); // Enlève la prévisualisation grisée
        const w = pos.x - startX;
        const h = pos.y - startY;
        if (Math.abs(w) > 5 && Math.abs(h) > 5) {
            applyAreaBlur(ctx, startX, startY, w, h, userBlurIntensity);
        }
    } else if (currentMode === 'sequence') {
        ctx.putImageData(snapshot, 0, 0); 
        const dx = pos.x - startX;
        const dy = pos.y - startY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Si on a glissé, on trace la flèche
        if (distance > 20) {
            drawArrow(ctx, startX, startY, pos.x, pos.y);
        }
        // Trace le cercle par-dessus l'origine de la flèche (ou simplement clique)
        drawSequenceCircle(ctx, startX, startY, sequenceCounter);
        
        // On incrémente uniquement relâché
        sequenceCounter++;
    } else if (currentMode === 'crop') {
        cropSelectionDiv.style.display = 'none';
        
        const w = Math.abs(pos.x - startX);
        const h = Math.abs(pos.y - startY);
        const x = Math.min(pos.x, startX);
        const y = Math.min(pos.y, startY);

        if (w > 20 && h > 20) {
            applyCrop(x, y, w, h);
        }
    }
}

function drawArrow(context, fromX, fromY, toX, toY) {
    const headlen = 15; // length of head in pixels
    const dx = toX - fromX;
    const dy = toY - fromY;
    const angle = Math.atan2(dy, dx);
    
    // Raccourcir la ligne principale pour ne pas qu'elle dépasse de la pointe (12px en arrière)
    const lineEndX = toX - 12 * Math.cos(angle);
    const lineEndY = toY - 12 * Math.sin(angle);
    
    context.beginPath();
    context.strokeStyle = '#e74c3c'; // Rouge
    context.lineWidth = 4;
    context.moveTo(fromX, fromY);
    context.lineTo(lineEndX, lineEndY);
    context.stroke();
    
    // Tête de la flèche
    context.beginPath();
    context.fillStyle = '#e74c3c';
    context.moveTo(toX, toY);
    context.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
    context.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
    context.lineTo(toX, toY);
    context.fill();
}

function drawRect(context, fromX, fromY, toX, toY) {
    context.beginPath();
    context.strokeStyle = '#e74c3c'; // Rouge
    context.lineWidth = 4;
    const w = toX - fromX;
    const h = toY - fromY;
    context.rect(fromX, fromY, w, h);
    context.stroke();
}

function drawSequenceCircle(context, x, y, number) {
    const radius = 16;
    
    // 1. Cercle rouge
    context.beginPath();
    context.arc(x, y, radius, 0, 2 * Math.PI, false);
    context.fillStyle = '#e74c3c'; // Rouge
    context.fill();
    context.lineWidth = 2;
    context.strokeStyle = '#c0392b'; // Rouge foncé (bordure)
    context.stroke();
    
    // 2. Texte blanc (numéro)
    context.fillStyle = '#ffffff'; // Blanc
    context.font = 'bold 16px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    
    // Léger ajustement vertical souvent nécessaire selon la police
    context.fillText(number.toString(), x, y + 1);
}

function applyAreaBlur(context, x, y, w, h, blurAmount) {
    // Rend les dimensions positives si tracé de bas en haut
    const rx = w < 0 ? x + w : x;
    const ry = h < 0 ? y + h : y;
    const rw = Math.abs(w);
    const rh = Math.abs(h);

    // Technique de pixelisation/box blur:
    // On prend l'image, on la réduit fortement puis on l'agrandit
    // (Une approche plus simple et rapide en JS qu'un vrai Gaussian Blur)
    
    // On extrait la zone
    const imageData = context.getImageData(rx, ry, rw, rh);
    
    // Canvas temporaire pour la manipulation
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = rw;
    tempCanvas.height = rh;
    const tCtx = tempCanvas.getContext('2d');
    tCtx.putImageData(imageData, 0, 0);
    
    // Applique le flou css sur le context principal...
    // Note: ctx.filter n'est pas supporté partout pour l'export. 
    // On le dessine donc offscreen :
    const blurCanvas = document.createElement('canvas');
    blurCanvas.width = rw;
    blurCanvas.height = rh;
    const bCtx = blurCanvas.getContext('2d');
    
    // Filtre natif très efficace (si supporté par le nav, sinon on pixellise)
    bCtx.filter = `blur(${blurAmount}px)`;
    bCtx.drawImage(tempCanvas, 0, 0);
    
    // Remet sur le canvas (le filtre s'applique)
    context.drawImage(blurCanvas, rx, ry);
}

function applyCrop(x, y, w, h) {
    // S'assurer qu'on travaille avec des entiers pour éviter les bugs sur certains navigateurs
    x = Math.round(x);
    y = Math.round(y);
    w = Math.max(1, Math.round(w));
    h = Math.max(1, Math.round(h));

    let croppedImage;
    try {
        croppedImage = ctx.getImageData(x, y, w, h);
    } catch (e) {
        console.error("Erreur getImageData lors du recadrage:", e);
        // Si erreur inattendue (cross-origin / dimensions), on annule le mode crop
        editorOverlay.classList.remove('doli-cropped');
        return;
    }
    
    // Le canvas prend la taille des pixels extraits, il sera géré par CSS `object-fit: contain`
    canvas.width = w;
    canvas.height = h;
    
    ctx.putImageData(croppedImage, 0, 0);
    
    // Enlève l'affichage en étirement pur et passe en mode "modal sombre"
    editorOverlay.classList.add('doli-cropped');
    
    // Nettoie les inline styles s'il y en avait
    canvas.style.width = '';
    canvas.style.height = '';
    
    // Ajuste le scale pour que dessiner ensuite soit toujours proportionnel (même si on crop, la résolution interne est 1:1 pour nous maintenant sur cette portion)
    const rect = canvas.getBoundingClientRect();
    canvas.scaleX = w / rect.width;
    canvas.scaleY = h / rect.height;
}

function addTextInput(canvasX, canvasY, clientX, clientY) {
    // Si on clique ailleurs, on valide le texte existant d'abord
    const existing = document.getElementById('doli-floating-text-input');
    if (existing) {
        existing.blur(); // déclenche l'écriture
    }

    const input = document.createElement('div');
    input.id = 'doli-floating-text-input';
    input.contentEditable = true;
    input.style.left = clientX + 'px';
    input.style.top = clientY + 'px';
    // Ajoutons un attribut placeholder via CSS ou texte par défaut (optionnel, on le garde vide pour l'instant)
    editorOverlay.appendChild(input);

    setTimeout(() => {
        input.focus();
    }, 10);

    // Isolement des frappes clavier par rapport au site hôte (ex: raccourcis)
    const stopEvent = (e) => e.stopPropagation();
    input.addEventListener('keydown', stopEvent);
    input.addEventListener('keyup', stopEvent);
    input.addEventListener('keypress', stopEvent);

    // Quand on perd le focus (clic à l'extérieur) on écrit sur le canvas et on supprime l'input
    input.addEventListener('blur', () => {
        const text = input.innerText.trim();
        if (text) {
            // Configuration de la police proportionnelle au scale du canvas
            const fontSize = Math.max(16, Math.floor(20 * Math.max(canvas.scaleX, canvas.scaleY)));
            ctx.font = 'bold ' + fontSize + 'px Arial';
            ctx.fillStyle = '#e74c3c';
            ctx.textBaseline = 'top';
            
            // Découpe multi-lignes naïve
            const lines = text.split('\n');
            let offsetY = 0;
            lines.forEach(line => {
                ctx.fillText(line, canvasX, canvasY + offsetY);
                offsetY += (fontSize * 1.2);
            });
        }
        if(input.parentNode) input.parentNode.removeChild(input);
    });
    
    // Valider sur "Entrée" sans majuscule, ou "Shift+Entrée" pour sauter une ligne
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            input.blur();
        }
    });
}

function closeEditor() {
    if (editorOverlay) {
        document.body.removeChild(editorOverlay);
        editorOverlay = null;
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
    }
}

function saveAndClose() {
    // Si un input texte est encore actif, on force son écriture
    const activeText = document.getElementById('doli-floating-text-input');
    if (activeText) activeText.blur();

    // Cache le curseur visuel s'il traîne, et ferme l'éditeur
    closeEditor();

    // Génère l'image finale selon la préférence utilisateur (JPG est souvent plus léger mais perd le canal alpha)
    let dataUrl;
    if (userImageFormat === 'jpg') {
        dataUrl = canvas.toDataURL('image/jpeg', 0.85); // Option JPG avec 85% de qualité
    } else {
        dataUrl = canvas.toDataURL('image/png');
    }
    
    // Sauvegarde la capture pour le popup
    chrome.storage.local.set({ doliPendingScreenshot: dataUrl }, () => {
        // Réouvre silencieusement le popup Chrome
        chrome.runtime.sendMessage({ action: "OPEN_EXTENSION_POPUP" });
    });
}

// ==========================================
// INTÉGRATION NEXTCLOUD MAIL
// ==========================================

function injectNextcloudButton() {
    // Vérifier si on est sur Nextcloud Mail
    if (!window.location.href.includes('/apps/mail/box')) return;

    // Chercher le bouton "Actions" (trois petits points)
    const actionBtns = document.querySelectorAll('.action-item__menutoggle');
    
    actionBtns.forEach(btn => {
        const parent = btn.parentElement;
        // On s'assure de ne pas l'ajouter deux fois
        if (!parent || parent.querySelector('.doli-nextcloud-btn')) return;

        // On crée un conteneur global (style dropdown basique de Nextcloud)
        const doliContainer = document.createElement('div');
        doliContainer.className = 'doli-nextcloud-btn doli-dropdown-container';
        doliContainer.style.position = 'relative';
        doliContainer.style.display = 'inline-block';
        doliContainer.style.marginRight = '8px';

        // Bouton principal (déclencheur du menu)
        const mainBtn = document.createElement('button');
        mainBtn.className = 'button-vue button-vue--size-normal'; // Enlevé vue-tertiary pour controler le fond
        mainBtn.style.display = 'inline-flex';
        mainBtn.style.alignItems = 'center';
        mainBtn.style.gap = '6px';
        mainBtn.style.padding = '0 16px'; // Un peu plus de padding horizontal pour la pilule
        mainBtn.style.backgroundColor = '#084B54'; // Couleur de fond ReedCRM (teal foncé)
        mainBtn.style.color = '#ffffff'; // Texte blanc
        mainBtn.style.borderRadius = '20px'; // Cadre très arrondi (style pilule)
        mainBtn.style.border = 'none';
        mainBtn.style.fontWeight = 'bold';
        mainBtn.style.transition = 'transform 0.1s, opacity 0.2s';
        mainBtn.title = "Actions ReedCRM";
        
        mainBtn.addEventListener('mouseenter', () => mainBtn.style.opacity = '0.9');
        mainBtn.addEventListener('mouseleave', () => mainBtn.style.opacity = '1');
        mainBtn.addEventListener('mousedown', () => mainBtn.style.transform = 'scale(0.95)');
        mainBtn.addEventListener('mouseup', () => mainBtn.style.transform = 'scale(1)');
        
        // SVG / Icon enlevé selon demande
        mainBtn.innerHTML = `
            <span class="button-vue__wrapper">
                <span class="button-vue__text" style="color: #ffffff;">ReedCRM ▼</span>
            </span>
        `;

        // Le menu déroulant
        const dropdown = document.createElement('div');
        dropdown.className = 'doli-dropdown-menu';
        dropdown.style.display = 'none';
        dropdown.style.position = 'absolute';
        dropdown.style.top = '100%';
        dropdown.style.left = '0';
        dropdown.style.backgroundColor = 'white';
        dropdown.style.border = '1px solid #ddd';
        dropdown.style.borderRadius = '4px';
        dropdown.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
        dropdown.style.zIndex = '1000';
        dropdown.style.minWidth = '150px';
        dropdown.style.padding = '4px 0';

        // L'action: Créer un ticket
        const ticketAction = document.createElement('div');
        ticketAction.style.padding = '8px 12px';
        ticketAction.style.cursor = 'pointer';
        ticketAction.style.display = 'flex';
        ticketAction.style.justifyContent = 'center';
        ticketAction.style.alignItems = 'center';
        ticketAction.style.color = '#333';
        ticketAction.title = 'Créer un Ticket';
        
        // Effet hover simple via JS
        ticketAction.addEventListener('mouseenter', () => ticketAction.style.backgroundColor = '#f5f5f5');
        ticketAction.addEventListener('mouseleave', () => ticketAction.style.backgroundColor = 'transparent');

        // Icône Ticket avec un + (pas de texte)
        ticketAction.innerHTML = `
            <svg fill="#95ecbf" width="20" height="20" viewBox="0 0 24 24"><path d="M22,10V6A2,2 0 0,0 20,4H4A2,2 0 0,0 2,6V10C3.11,10 4,10.9 4,12C4,13.11 3.11,14 2,14V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V14C20.89,14 20,13.11 20,12C20,10.9 20.89,10 22,10M11,15H13V13H15V11H13V9H11V11H9V13H11V15Z"></path></svg>
        `;

        ticketAction.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropdown.style.display = 'none'; // Ferme le menu
            extractAndOpenTicket();
        });

        // Toggle simple du menu
        mainBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
        });

        // Fermer le menu si on clique ailleurs dans la page
        document.addEventListener('click', (e) => {
            if (!doliContainer.contains(e.target)) {
                dropdown.style.display = 'none';
            }
        });

        // Assemblage
        dropdown.appendChild(ticketAction);
        doliContainer.appendChild(mainBtn);
        doliContainer.appendChild(dropdown);

        // Insère le conteneur juste avant le bouton "Actions"
        parent.insertBefore(doliContainer, btn);
    });
}

function extractAndOpenTicket() {
    let subject = "";
    let message = "";

    // 1. Extraction du sujet (Nextcloud utilise diverses classes selon les versions, on ratisse large)
    // Pour éviter d'attraper les titres de la barre latérale (.subject etc.), on teste les sélecteurs par ordre de pertinence.
    const selectors = [
        '#mail-thread-header-fields h2',
        '#mail-thread-header h2',
        '.message-head__subject',
        '.thread-message__subject',
        'h1.message-subject',
        '.envelope__subject',
        '.subject'
    ];
    
    let subjectEl = null;
    for (const sel of selectors) {
        subjectEl = document.querySelector(sel);
        if (subjectEl) break;
    }

    if (subjectEl) {
        // Nettoyer le texte (ignorer d'éventuels badges span internes)
        subject = subjectEl.innerText.trim();
    } else {
        // Fallback: chercher dans le fil d'ariane ou le titre de la vue principale
        const altSubject = document.querySelector('.app-content-list-item.active .app-content-list-item-line-one, .mail-message-header .title');
        if (altSubject) subject = altSubject.innerText.trim();
    }

    // 2. Extraction du corps (parfois iframe texte riche, ou div text brut)
    const iframe = document.querySelector('iframe.message-frame, iframe[title="Message"], iframe.message-body__html');
    if (iframe && iframe.contentDocument) {
        message = iframe.contentDocument.body.innerText.trim();
    } else {
        const bodyEl = document.querySelector('.message-body__content, .message-body, .message__body, .mail-message-body');
        if (bodyEl) {
            message = bodyEl.innerText.trim();
        }
    }

    // Sauvegarde en local pour que le popup le récupère et s'ouvre
    chrome.storage.local.set({ 
        doliPrefillSubject: subject || 'Nouveau ticket depuis Nextcloud',
        doliPrefillMessage: message || 'Contenu de l\'e-mail introuvable. Veuillez copier/coller le texte ici.'
    }, () => {
        chrome.runtime.sendMessage({ action: "OPEN_EXTENSION_POPUP" });
    });
}

// Observer DOM pour détecter quand Nextcloud navigue d'un email à l'autre (Vue.js change le DOM sans recharger la page)
const nextcloudObserver = new MutationObserver(() => {
    if (window.location.href.includes('/apps/mail/box')) {
        injectNextcloudButton();
    }
});
nextcloudObserver.observe(document.body, { childList: true, subtree: true });

// Lancement initial
setTimeout(injectNextcloudButton, 1500);
