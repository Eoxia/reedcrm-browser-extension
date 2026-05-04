const fs = require('fs');
let js = fs.readFileSync('ui/popup/popup.js', 'utf8');

const target1 =         const input = document.createElement('input');
        input.type = 'text';
        input.id = 'inline_edit_' + fieldName + '_' + projectId;
        input.name = 'inline_edit_' + fieldName;
        input.className = 'inline-edit-input';
        input.value = currentValue;;

const replacement1 =         let input;
        if (fieldName === 'fk_statut' || fieldName === 'severity_code' || fieldName === 'fk_user_assign') {
            input = document.createElement('select');
            input.id = 'inline_edit_' + fieldName + '_' + projectId;
            input.className = 'inline-edit-input inline-edit-select';
            
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
                    opt.textContent = label;
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
                    opt.textContent = label;
                    if (String(val) === String(currentValue)) opt.selected = true;
                    input.appendChild(opt);
                }
            } else if (fieldName === 'fk_user_assign') {
                const optEmpty = document.createElement('option');
                optEmpty.value = "";
                optEmpty.textContent = "Non assigné";
                input.appendChild(optEmpty);
                if (window.usersList && window.usersList.length > 0) {
                    window.usersList.forEach(u => {
                        const opt = document.createElement('option');
                        opt.value = u.id;
                        opt.textContent = (u.firstname || '') + ' ' + (u.lastname || u.login || '');
                        if (String(u.id) === String(currentValue)) opt.selected = true;
                        input.appendChild(opt);
                    });
                }
            }
        } else {
            input = document.createElement('input');
            input.type = 'text';
            input.id = 'inline_edit_' + fieldName + '_' + projectId;
            input.name = 'inline_edit_' + fieldName;
            input.className = 'inline-edit-input';
            input.value = currentValue;
        };

js = js.replace(target1, replacement1);
fs.writeFileSync('ui/popup/popup.js', js, 'utf8');
