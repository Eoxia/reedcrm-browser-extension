// ui/popup/src/store/store.js
export const store = {
    state: {
        tickets: [],
        opportunities: [],
        users: [],
        thirdparties: [],
        contacts: [],
        projects: [],
        loading: {
            tickets: false,
            opportunities: false,
            global: false
        },
        activeProfile: null
    },
    
    listeners: [],
    
    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    },
    
    notify() {
        this.listeners.forEach(listener => listener(this.state));
    },
    
    setTickets(tickets) {
        this.state.tickets = tickets;
        this.notify();
    },

    updateTicket(ticketId, updates) {
        const index = this.state.tickets.findIndex(t => String(t.id) === String(ticketId));
        if (index !== -1) {
            this.state.tickets[index] = { ...this.state.tickets[index], ...updates };
            this.notify();
        }
    },
    
    setOpportunities(opportunities) {
        this.state.opportunities = opportunities;
        this.notify();
    },

    updateOpportunity(oppId, updates) {
        const index = this.state.opportunities.findIndex(o => String(o.id) === String(oppId));
        if (index !== -1) {
            this.state.opportunities[index] = { ...this.state.opportunities[index], ...updates };
            this.notify();
        }
    },
    
    setLoading(key, isLoading) {
        this.state.loading[key] = isLoading;
        this.notify();
    },
    
    setUsers(users) {
        this.state.users = users;
        this.notify();
    },

    setThirdparties(thirdparties) {
        this.state.thirdparties = thirdparties;
        this.notify();
    },
    
    setActiveProfile(profile) {
        this.state.activeProfile = profile;
        this.notify();
    }
};
