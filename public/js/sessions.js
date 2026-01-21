// Cocktails & Cards - Sessions UI Logic

const SessionsUI = {
    sessions: [],
    currentSession: null,

    async render(sessionId) {
        if (sessionId) {
            await this.renderDetail(sessionId);
        } else {
            await this.renderList();
        }
    },

    async renderList() {
        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="page-header">
                <h1><i class="bi bi-calendar-event me-2"></i>Sessions</h1>
            </div>
            <div class="container-fluid">
                <div id="sessionsList">
                    <div class="loading"><div class="spinner-border text-primary"></div></div>
                </div>
            </div>
            <button class="fab" onclick="SessionsUI.openAddModal()">
                <i class="bi bi-plus-lg"></i>
            </button>
        `;

        await this.loadSessions();
    },

    async loadSessions() {
        try {
            const res = await fetch('/api/sessions');
            this.sessions = await res.json();
            this.renderSessionsList();
        } catch (error) {
            console.error('Failed to load sessions:', error);
        }
    },

    renderSessionsList() {
        const container = document.getElementById('sessionsList');
        if (!container) return;

        if (this.sessions.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="bi bi-calendar-event"></i>
                    <h5>No Sessions Yet</h5>
                    <p>Create your first CnC session to get started!</p>
                    <button class="btn btn-primary" onclick="SessionsUI.openAddModal()">
                        <i class="bi bi-plus-lg me-2"></i>New Session
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = this.sessions.map(s => `
            <div class="card session-card" onclick="SessionsUI.openDetail(${s.id})">
                <div class="card-body">
                    <div class="d-flex align-items-start">
                        <div class="avatar me-3" style="background-color: ${s.host_color || '#3498db'}">
                            ${(s.host_name || 'U').charAt(0)}
                        </div>
                        <div class="flex-grow-1">
                            <div class="session-date">${formatDate(s.session_date)}</div>
                            ${s.theme ? `<div class="session-theme">${s.theme}</div>` : ''}
                            <div class="session-meta">
                                Hosted by ${s.host_name || 'Unknown'}
                            </div>
                        </div>
                        <div class="text-end">
                            <span class="badge bg-primary">${s.cocktail_count} cocktail${s.cocktail_count !== 1 ? 's' : ''}</span>
                        </div>
                        <i class="bi bi-chevron-right text-muted ms-2"></i>
                    </div>
                </div>
            </div>
        `).join('');
    },

    async renderDetail(id) {
        const app = document.getElementById('app');
        app.innerHTML = `<div class="loading"><div class="spinner-border text-primary"></div></div>`;

        try {
            const res = await fetch(`/api/sessions/${id}`);
            if (!res.ok) throw new Error('Session not found');
            this.currentSession = await res.json();

            app.innerHTML = `
                <div class="page-header">
                    <div class="d-flex align-items-center">
                        <button class="btn btn-link text-white p-0 me-3" onclick="window.location.hash='#/sessions'">
                            <i class="bi bi-arrow-left fs-4"></i>
                        </button>
                        <div>
                            <h1 class="mb-0">${formatDate(this.currentSession.session_date)}</h1>
                            ${this.currentSession.theme ? `<div class="small opacity-75">${this.currentSession.theme}</div>` : ''}
                        </div>
                    </div>
                </div>
                <div class="container-fluid">
                    <div class="card mb-3">
                        <div class="card-body">
                            <div class="d-flex align-items-center">
                                <div class="avatar me-3" style="background-color: ${this.currentSession.host_color || '#3498db'}">
                                    ${(this.currentSession.host_name || 'U').charAt(0)}
                                </div>
                                <div>
                                    <div class="fw-bold">Hosted by ${this.currentSession.host_name || 'Unknown'}</div>
                                    ${this.currentSession.notes ? `<div class="text-muted small">${this.currentSession.notes}</div>` : ''}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h5 class="mb-0">Cocktails Served</h5>
                        <button class="btn btn-sm btn-primary" onclick="SessionsUI.openAddCocktailModal()">
                            <i class="bi bi-plus-lg me-1"></i>Add
                        </button>
                    </div>

                    <div id="sessionCocktails">
                        ${this.renderServings(this.currentSession.servings)}
                    </div>

                    <div class="d-flex gap-2 mt-4">
                        <button class="btn btn-outline-danger flex-grow-1" onclick="SessionsUI.deleteSession(${this.currentSession.id})">
                            <i class="bi bi-trash me-2"></i>Delete
                        </button>
                        <button class="btn btn-primary flex-grow-1" onclick="SessionsUI.openEditModal(${this.currentSession.id})">
                            <i class="bi bi-pencil me-2"></i>Edit
                        </button>
                    </div>
                </div>
            `;
        } catch (error) {
            app.innerHTML = `
                <div class="empty-state">
                    <i class="bi bi-exclamation-circle"></i>
                    <h5>Session Not Found</h5>
                    <button class="btn btn-primary" onclick="window.location.hash='#/sessions'">
                        Back to Sessions
                    </button>
                </div>
            `;
        }
    },

    renderServings(servings) {
        if (!servings || servings.length === 0) {
            return `
                <div class="empty-state py-3">
                    <i class="bi bi-cup-straw"></i>
                    <p class="mb-0">No cocktails served yet</p>
                </div>
            `;
        }

        return servings.map(s => `
            <div class="card serving-card mb-2">
                <div class="card-body d-flex align-items-center">
                    <div class="avatar-sm me-3" style="background-color: ${s.server_color || '#3498db'}">
                        ${(s.server_name || 'U').charAt(0)}
                    </div>
                    <div class="flex-grow-1">
                        <div class="fw-bold">${s.cocktail_name}</div>
                        <div class="small text-muted">
                            Served by ${s.server_name || 'Unknown'}
                            ${s.notes ? ` &middot; ${s.notes}` : ''}
                        </div>
                    </div>
                    <button class="btn btn-sm btn-outline-danger" onclick="event.stopPropagation(); SessionsUI.removeServing(${s.id})">
                        <i class="bi bi-x"></i>
                    </button>
                </div>
            </div>
        `).join('');
    },

    openDetail(id) {
        window.location.hash = `#/sessions/${id}`;
    },

    openAddModal() {
        this.currentSession = null;
        document.getElementById('sessionModalTitle').textContent = 'New Session';
        document.getElementById('sessionId').value = '';
        document.getElementById('sessionForm').reset();
        document.getElementById('sessionDate').value = getToday();
        this.populateHostSelect();

        const modal = new bootstrap.Modal(document.getElementById('sessionModal'));
        modal.show();
    },

    async openEditModal(id) {
        try {
            const res = await fetch(`/api/sessions/${id}`);
            this.currentSession = await res.json();

            document.getElementById('sessionModalTitle').textContent = 'Edit Session';
            document.getElementById('sessionId').value = this.currentSession.id;
            document.getElementById('sessionDate').value = this.currentSession.session_date;
            document.getElementById('sessionTheme').value = this.currentSession.theme || '';
            document.getElementById('sessionNotes').value = this.currentSession.notes || '';

            this.populateHostSelect();
            document.getElementById('sessionHost').value = this.currentSession.host_id || '';

            const modal = new bootstrap.Modal(document.getElementById('sessionModal'));
            modal.show();
        } catch (error) {
            console.error('Failed to load session:', error);
            alert('Failed to load session');
        }
    },

    populateHostSelect() {
        const select = document.getElementById('sessionHost');
        select.innerHTML = '<option value="">Select host</option>' +
            App.players.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
    },

    async saveSession() {
        const id = document.getElementById('sessionId').value;
        const data = {
            session_date: document.getElementById('sessionDate').value,
            host_id: document.getElementById('sessionHost').value || null,
            theme: document.getElementById('sessionTheme').value || null,
            notes: document.getElementById('sessionNotes').value || null
        };

        if (!data.session_date) {
            alert('Please select a date');
            return;
        }

        try {
            const url = id ? `/api/sessions/${id}` : '/api/sessions';
            const method = id ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (res.ok) {
                bootstrap.Modal.getInstance(document.getElementById('sessionModal')).hide();
                if (window.location.hash.includes('/sessions/')) {
                    const session = await res.json();
                    this.renderDetail(session.id);
                } else {
                    this.loadSessions();
                }
            } else {
                const error = await res.json();
                alert(error.error || 'Failed to save session');
            }
        } catch (error) {
            console.error('Failed to save session:', error);
            alert('Failed to save session');
        }
    },

    async deleteSession(id) {
        if (!confirm('Are you sure you want to delete this session? All cocktail servings will be removed.')) return;

        try {
            const res = await fetch(`/api/sessions/${id}`, { method: 'DELETE' });
            if (res.ok) {
                window.location.hash = '#/sessions';
            } else {
                alert('Failed to delete session');
            }
        } catch (error) {
            console.error('Failed to delete session:', error);
            alert('Failed to delete session');
        }
    },

    openAddCocktailModal() {
        this.populateCocktailSelect();
        this.populateServerSelect();
        document.getElementById('addCocktailToSessionForm').reset();

        const modal = new bootstrap.Modal(document.getElementById('addCocktailToSessionModal'));
        modal.show();
    },

    async populateCocktailSelect() {
        const select = document.getElementById('sessionCocktailSelect');
        try {
            const res = await fetch('/api/cocktails');
            const cocktails = await res.json();
            select.innerHTML = '<option value="">Select cocktail</option>' +
                cocktails.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        } catch (error) {
            console.error('Failed to load cocktails:', error);
        }
    },

    populateServerSelect() {
        const select = document.getElementById('sessionServingServer');
        select.innerHTML = '<option value="">Select who served</option>' +
            App.players.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
    },

    async addCocktailToSession() {
        const cocktail_id = document.getElementById('sessionCocktailSelect').value;
        const served_by = document.getElementById('sessionServingServer').value || null;
        const notes = document.getElementById('sessionServingNotes').value || null;

        if (!cocktail_id) {
            alert('Please select a cocktail');
            return;
        }

        try {
            const res = await fetch(`/api/sessions/${this.currentSession.id}/cocktails`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cocktail_id, served_by, notes })
            });

            if (res.ok) {
                bootstrap.Modal.getInstance(document.getElementById('addCocktailToSessionModal')).hide();
                this.renderDetail(this.currentSession.id);
            } else {
                const error = await res.json();
                alert(error.error || 'Failed to add cocktail');
            }
        } catch (error) {
            console.error('Failed to add cocktail:', error);
            alert('Failed to add cocktail');
        }
    },

    async removeServing(servingId) {
        if (!confirm('Remove this cocktail from the session?')) return;

        try {
            const res = await fetch(`/api/sessions/${this.currentSession.id}/cocktails/${servingId}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                this.renderDetail(this.currentSession.id);
            } else {
                alert('Failed to remove cocktail');
            }
        } catch (error) {
            console.error('Failed to remove cocktail:', error);
            alert('Failed to remove cocktail');
        }
    }
};

// Setup event listeners when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('saveSession')?.addEventListener('click', () => SessionsUI.saveSession());
    document.getElementById('addCocktailToSessionBtn')?.addEventListener('click', () => SessionsUI.addCocktailToSession());
});
