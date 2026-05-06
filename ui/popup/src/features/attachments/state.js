export const attachmentsState = {
    ticketFiles: [],
    oppFiles: []
};

export function clearTicketFiles() {
    attachmentsState.ticketFiles = [];
}

export function clearOppFiles() {
    attachmentsState.oppFiles = [];
}
