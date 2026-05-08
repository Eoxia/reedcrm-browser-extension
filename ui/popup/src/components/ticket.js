export function renderTicketItemHtml(mappedTicket) {
    const assigneeHtml = mappedTicket.photoUrl
        ? `<img src="${mappedTicket.photoUrl}" alt="${mappedTicket.initials}" data-initials="${mappedTicket.initials}" class="avatar-img">`
        : mappedTicket.initials;

    const companyHtml = mappedTicket.companyName ? `<span class="tc-company" title="Tiers"><i class="fas fa-building" style="color: #6a7491;"></i> ${mappedTicket.companyName}</span> <span class="tc-sep">•</span>` : '';

    return `
        <div class="ticket-card-new recent-ticket-item" data-search="${mappedTicket.searchString}" data-date="${mappedTicket.datec || 0}" data-stat="${mappedTicket.stat}" data-assignee="${mappedTicket.fk_user_assign || ''}">
            <div class="tc-header">
                <div class="tc-meta">
                    <a href="${mappedTicket.ticketUrl}" target="_blank" class="tc-ref" style="text-decoration: none;">${mappedTicket.ref}</a> <span class="tc-sep">•</span> 
                    ${companyHtml}
                    <span class="tc-date" title="Créé le">${mappedTicket.dateFormatted}</span> <span class="tc-sep">•</span> 
                    <span class="tc-time" title="Temps écoulé">${mappedTicket.elapsedTimeStr || 'Tps: 00:00'}</span> <span class="tc-sep">•</span>
                    <span class="inline-editable tc-severity" data-field="severity_code" data-pid="${mappedTicket.id}" data-val="${mappedTicket.severityCode || ''}" title="Sévérité">${mappedTicket.severity}</span> <span class="tc-sep">•</span>
                    <span class="inline-editable tc-progress" data-field="progress" data-pid="${mappedTicket.id}" data-val="${mappedTicket.progressPct}" title="Avancement">${mappedTicket.progressPct}%</span>
                </div>
                <div class="tc-assignee inline-editable" data-field="fk_user_assign" data-pid="${mappedTicket.id}" data-val="${mappedTicket.fk_user_assign || ''}" title="Assigné à">
                    ${assigneeHtml}
                </div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                <div class="tc-title inline-editable" data-field="subject" data-pid="${mappedTicket.id}" data-val="${mappedTicket.safeSubject}" title="${mappedTicket.safeSubject}" style="flex: 1;">${mappedTicket.safeSubject}</div>
                <div class="tc-actions">
                    <div class="inline-editable tc-status-btn" data-field="fk_statut" data-pid="${mappedTicket.id}" data-val="${mappedTicket.stat}" title="Changer le statut">
                        <div class="tc-status-dot" style="background-color: ${mappedTicket.statusColor}"></div>
                        <span class="tc-status-label" style="text-transform: uppercase;">${mappedTicket.statusLabelText}</span>
                    </div>
                    <a href="${mappedTicket.chatUrl}" target="_blank" class="tc-chat-link" title="Messages & Evénements">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                    </a>
                </div>
            </div>
            <div class="tc-body" style="margin-top: 4px;">
                <div class="tc-message-preview inline-editable" data-field="message" data-pid="${mappedTicket.id}" data-val="${mappedTicket.safeMessageAttr}" title="${mappedTicket.safeMessageAttr}">${mappedTicket.safeMessage}</div>
            </div>
        </div>
    `.trim();
}
