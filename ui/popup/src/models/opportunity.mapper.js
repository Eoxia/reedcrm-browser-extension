export function mapOpportunity(project, state) {
    let subject = project.title || project.ref || "Projet sans titre";
    if (subject.length > 50) subject = subject.substring(0, 50) + '...';

    const stat = String(project.statut || project.status || "0");
    let statusColor = "#95a5a6";
    let statusLabelText = stat;
    const oppStatusMap = {
        "0": "Brouillon",
        "1": "Validé / Ouvert",
        "2": "Clôturé"
    };
    if (oppStatusMap[stat]) statusLabelText = oppStatusMap[stat];
    if (project.status_label) statusLabelText = project.status_label;
    else if (project.statut_label) statusLabelText = project.statut_label;

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
    if (project.user_author_id && state && state.users) {
        const u = state.users.find(u => String(u.id) === String(project.user_author_id));
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
    const oppOriginRaw = opts.options_opporigin || opts.options_origine_opportunite || opts.options_origine || opts.options_origin || opts.options_source || opts.options_provenance || opts.options_prov || opts.options_opp_origin || opts.options_canal || '';
    
    let mappedOrigin = oppOriginRaw;
    if (state && state.oppDictionaries) {
        if (oppOriginRaw && state.oppDictionaries.customOppDict && state.oppDictionaries.customOppDict[oppOriginRaw]) {
            mappedOrigin = state.oppDictionaries.customOppDict[oppOriginRaw];
        } else if (oppOriginRaw && state.oppDictionaries.oppOriginDict && state.oppDictionaries.oppOriginDict[oppOriginRaw]) {
            mappedOrigin = state.oppDictionaries.oppOriginDict[oppOriginRaw];
        } else if (oppOriginRaw && state.oppDictionaries.dolibarrNativeInputReasons && state.oppDictionaries.dolibarrNativeInputReasons[oppOriginRaw]) {
            mappedOrigin = state.oppDictionaries.dolibarrNativeInputReasons[oppOriginRaw];
        }
    }

    let messageDisplay = project.description || "";
    if (messageDisplay.length > 100) messageDisplay = messageDisplay.substring(0, 100) + '...';

    const searchString = `${projectRef} ${subject} ${oppNom} ${oppPrenom} ${oppTel} ${oppEmail} ${amountDisplay}`.toLowerCase();

    return {
        id: project.id,
        rawProject: project,
        ref: projectRef,
        subject,
        stat,
        statusLabelText,
        statusColor,
        dateCStr,
        initials,
        amountDisplay,
        probDisplay,
        oppNom,
        oppPrenom,
        oppTel,
        oppEmail,
        oppWebsite,
        oppOriginRaw,
        mappedOrigin,
        messageDisplay,
        searchString
    };
}
