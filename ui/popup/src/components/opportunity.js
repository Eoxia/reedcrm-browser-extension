export function renderOppItemHtml(mappedOpp) {
    const prenomVal = mappedOpp.oppPrenom || "";
    const nomVal = mappedOpp.oppNom || "";
    const telVal = mappedOpp.oppTel || "";
    const emailVal = mappedOpp.oppEmail || "";
    const websiteVal = mappedOpp.oppWebsite || "";
    const oppOrigin = typeof mappedOpp.mappedOrigin === 'string' ? mappedOpp.mappedOrigin.charAt(0).toUpperCase() + mappedOpp.mappedOrigin.slice(1).replace(/_/g, ' ') : mappedOpp.mappedOrigin;

    let line1Html = `<div style="display: flex; align-items: center; gap: 4px;">` +
                    `<span class="inline-editable ${!prenomVal ? 'placeholder-text' : ''}" data-field="options_reedcrm_firstname" data-pid="${mappedOpp.id}" data-val="${prenomVal}" title="Cliquez pour modifier">${prenomVal || 'Prénom'}</span> ` +
                    `<span class="inline-editable ${!nomVal ? 'placeholder-text' : ''}" data-field="options_reedcrm_lastname" data-pid="${mappedOpp.id}" data-val="${nomVal}" title="Cliquez pour modifier">${nomVal || 'Nom'}</span>` +
                    `</div>` +
                    `<span class="rt-sep">&bull;</span>` +
                    `<div style="display: flex; align-items: center; gap: 4px;">` +
                    `<span class="inline-editable ${!telVal ? 'placeholder-text' : ''}" data-field="options_projectphone" data-pid="${mappedOpp.id}" data-val="${telVal}" title="Cliquez pour modifier">${telVal || '0102030405'}</span>` +
                    `<svg class="copy-icon" data-copy-target="tel" data-copy="${telVal}" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" title="Copier le numéro"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>` +
                    `</div>`;

    let displayEmail = emailVal.length > 45 ? emailVal.substring(0, 45) + '...' : emailVal;
    let line2Html = `<div style="display: flex; align-items: center; gap: 4px;">` +
                    `<span class="inline-editable ${!emailVal ? 'placeholder-text' : ''}" data-field="options_reedcrm_email" data-pid="${mappedOpp.id}" data-val="${emailVal}" title="Cliquez pour modifier">${displayEmail || 'nomail@nomail.com'}</span>` +
                    `<svg class="copy-icon" data-copy-target="email" data-copy="${emailVal}" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" title="Copier l'email"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>` +
                    `</div>`;
    
    let line3Html = `<div class="rt-contact-line-web" style="display: flex; align-items: center; gap: 4px;">` +
                    `<span class="inline-editable ${!websiteVal ? 'placeholder-text' : ''}" data-field="options_reedcrm_website" data-pid="${mappedOpp.id}" data-val="${websiteVal}" title="Cliquez pour modifier">${websiteVal || 'https://www.website.com'}</span>` +
                    (websiteVal ? ` <a href="${websiteVal.startsWith('http') ? websiteVal : 'https://' + websiteVal}" target="_blank" class="rt-contact-link"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg></a>` : '') +
                    `</div>`;
    
    let contactHtml = '';
    if (line1Html !== '' || line2Html !== '' || line3Html !== '' || oppOrigin !== '') {
        contactHtml = `<div class="rt-contact">`;
        if (line1Html !== '') {
            contactHtml += `<div class="rt-contact-line1 rt-contact-line">${line1Html}</div>`;
        }
        if (line2Html !== '') {
            contactHtml += `<div class="rt-contact-line2 rt-contact-line" style="margin-top: 1px;">${line2Html}</div>`;
        }
        if (line3Html !== '') {
            contactHtml += `<div class="rt-contact-line-web rt-contact-line" style="margin-top: 1px;">${line3Html}</div>`;
        }
        if (oppOrigin !== '') {
            contactHtml += `<div class="rt-contact-line3" style="margin-top: 3px; display: flex; align-items: center; color: #475569; font-size: 11px;">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1;" title="${oppOrigin}">${oppOrigin}</span>
            </div>`;
        }
        contactHtml += `</div>`;
    }

    return `
<div id="opp-list-item-${mappedOpp.id}" class="recent-ticket-item opp-list-item" style="align-items: flex-start;" data-search="${mappedOpp.searchString}" data-date="${mappedOpp.date_c || 0}" data-stat="${mappedOpp.stat}">
    <div class="rt-left">
        <div class="rt-ref-group" style="display: flex; align-items: center; gap: 6px; white-space: nowrap;">
            <a href="${mappedOpp.projectUrl}" target="_blank" class="rt-ref" title="Ouvrir le projet">${mappedOpp.ref}</a>
            ${mappedOpp.dateCStr ? `<span class="rt-sep">&bull;</span><div style="font-size: 10px; color: #888;">${mappedOpp.dateCStr}</div>` : ''}
            ${mappedOpp.initials !== "?" ? `<span class="rt-sep">&bull;</span><div style="font-size: 9px; background: #e2e8f0; color: #475569; padding: 1px 4px; border-radius: 4px;" title="Créé par">#${mappedOpp.initials}</div>` : ''}
            <span class="rt-sep">&bull;</span><div class="inline-editable user-commercial-select" data-field="commercial_id" data-pid="${mappedOpp.id}" data-val="" style="font-size: 9px; background: #e0f2fe; color: #0284c7; padding: 1px 4px; border-radius: 4px; cursor: pointer; min-width: 16px; text-align: center; display: flex; align-items: center; white-space: nowrap;" title="Commercial affecté"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:2px; flex-shrink:0;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>...</div>
        </div>
        <div class="rt-subject" title="${mappedOpp.subject.replace(/"/g, '')}" style="display: flex; align-items: center; gap: 6px; margin-top: 3px;">
            <div class="rt-status-dot" title="Statut: ${mappedOpp.statusLabelText}" style="width: 8px; height: 8px; border-radius: 50%; background-color: ${mappedOpp.statusColor}; flex-shrink: 0;"></div>
            <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; flex: 1; font-size: 13px; color: #334155; font-weight: 400;">${mappedOpp.subject}</span>
        </div>
        ${contactHtml}
    </div>
    <div class="rt-right" style="display: flex; flex-direction: column; align-items: flex-end; justify-content: flex-start;">
        <div class="rt-stats" style="font-size: 13px; font-weight: 400; display: flex; flex-direction: column; align-items: flex-end; gap: 2px; white-space: nowrap;">
            <span class="inline-editable ${!mappedOpp.rawProject.opp_percent ? 'placeholder-text' : ''}" data-field="opp_percent" data-pid="${mappedOpp.id}" data-val="${mappedOpp.rawProject.opp_percent || ''}" title="Cliquez pour modifier le pourcentage" style="color: #1e293b;">${mappedOpp.probDisplay || '0 %'}</span>
            <span class="inline-editable ${!mappedOpp.rawProject.opp_amount ? 'placeholder-text' : ''}" data-field="opp_amount" data-pid="${mappedOpp.id}" data-val="${mappedOpp.rawProject.opp_amount || ''}" title="Cliquez pour modifier le montant" style="color: #1e293b;">${mappedOpp.amountDisplay || '0 €'}</span>
        </div>
    </div>
</div>`.trim();
}
