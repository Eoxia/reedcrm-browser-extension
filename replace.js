const fs = require('fs');
const lines = fs.readFileSync('ui/popup/popup.js', 'utf8').split('\n');
const start = 716;
const end = 846;

const escapeHtml = (unsafe) => {
    if (!unsafe) return '';
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

const replacement = \                            // ============================================
                            // Construction du DOM (Template Literal avec échappement)
                            // ============================================
                            const safeSubject = (ticket.subject || "Sans titre").replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                            const safeMessage = (ticket.message || "").replace(/<[^>]*>?/gm, '').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                            const searchString = (ticketRef + ' ' + safeSubject).toLowerCase();
                            
                            const assigneeHtml = ticket.user_assign_photo && ticket.user_assign_photo.trim() !== ''
                                ? \\\<img src="\\\/document.php?modulepart=user&file=\\\" alt="\\\" onerror="this.outerHTML='\\\'">\\\
                                : initials;

                            const html = \\\
                                <div class="ticket-card-new recent-ticket-item" data-search="\\\" data-date="\\\" data-stat="\\\">
                                    <div class="tc-header">
                                        <div class="tc-meta">
                                            <a href="\\\/ticket/card.php?id=\\\" target="_blank" class="tc-ref" style="text-decoration: none;">\\\</a> <span class="tc-sep">•</span> 
                                            <span class="tc-date" title="Créé le">\\\</span> <span class="tc-sep">•</span> 
                                            <span class="tc-time" title="Temps écoulé">\\\</span> <span class="tc-sep">•</span>
                                            <span class="inline-editable tc-severity" data-field="severity_code" data-pid="\\\" data-val="\\\" title="Sévérité">\\\</span> <span class="tc-sep">•</span>
                                            <span class="inline-editable tc-progress" data-field="progress" data-pid="\\\" data-val="\\\" title="Avancement">\\\%</span>
                                        </div>
                                        <div class="tc-assignee inline-editable" data-field="fk_user_assign" data-pid="\\\" data-val="\\\" title="Assigné à">
                                            \\\
                                        </div>
                                    </div>
                                    <div class="tc-title" title="\\\">\\\</div>
                                    <div class="tc-body">
                                        <div class="tc-message-preview" title="\\\">\\\</div>
                                        <div class="tc-actions">
                                            <a href="\\\/ticket/messaging.php?id=\\\" target="_blank" class="tc-chat-link" title="Messages & Evénements">
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                                            </a>
                                            <div class="inline-editable tc-status-btn" data-field="fk_statut" data-pid="\\\" data-val="\\\" title="Changer le statut">
                                                <div class="tc-status-dot" style="background-color: \\\"></div>
                                                <span class="tc-status-label" style="text-transform: uppercase;">\\\</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            \\\;
                            
                            const div = document.createElement('div');
                            div.innerHTML = html.trim();
                            recentTicketsList.appendChild(div.firstChild);\;

lines.splice(start, end - start + 1, replacement);
fs.writeFileSync('ui/popup/popup.js', lines.join('\n'), 'utf8');
