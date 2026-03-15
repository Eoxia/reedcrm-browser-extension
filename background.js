// background.js - Gère les événements d'arrière-plan de l'extension

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "OPEN_EXTENSION_POPUP") {
        // Ouvre le popup de l'extension par-dessus la page actuelle
        chrome.action.openPopup();
    } else if (request.action === "OPEN_OPTIONS_PAGE") {
        chrome.runtime.openOptionsPage();
    }
});
