// Cocktails & Cards - Cocktails UI Logic

const CocktailsUI = {
    cocktails: [],
    currentCocktail: null,
    searchTimeout: null,

    async render(cocktailId) {
        if (cocktailId) {
            await this.renderDetail(cocktailId);
        } else {
            await this.renderList();
        }
    },

    async renderList() {
        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="page-header">
                <h1><i class="bi bi-cup-straw me-2"></i>Cocktails</h1>
            </div>
            <div class="container-fluid">
                <div class="search-bar mb-3 d-flex align-items-center">
                    <i class="bi bi-search text-muted me-2"></i>
                    <input type="text" id="cocktailSearch" placeholder="Search cocktails..." class="flex-grow-1">
                </div>
                <div id="cocktailsList">
                    <div class="loading"><div class="spinner-border text-primary"></div></div>
                </div>
            </div>
            <button class="fab" onclick="CocktailsUI.openAddModal()">
                <i class="bi bi-plus-lg"></i>
            </button>
        `;

        document.getElementById('cocktailSearch').addEventListener('input', (e) => {
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => this.loadCocktails(e.target.value), 300);
        });

        await this.loadCocktails();
    },

    async loadCocktails(search = '') {
        try {
            const url = search ? `/api/cocktails?search=${encodeURIComponent(search)}` : '/api/cocktails';
            const res = await fetch(url);
            this.cocktails = await res.json();
            this.renderCocktailsList();
        } catch (error) {
            console.error('Failed to load cocktails:', error);
        }
    },

    renderCocktailsList() {
        const container = document.getElementById('cocktailsList');
        if (!container) return;

        if (this.cocktails.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="bi bi-cup-straw"></i>
                    <h5>No Cocktails Yet</h5>
                    <p>Add your first cocktail to get started!</p>
                    <button class="btn btn-primary" onclick="CocktailsUI.openAddModal()">
                        <i class="bi bi-plus-lg me-2"></i>Add Cocktail
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = this.cocktails.map(c => `
            <div class="card cocktail-card" onclick="CocktailsUI.openDetail(${c.id})">
                <div class="card-body">
                    <div class="d-flex align-items-start">
                        <div class="avatar me-3" style="background-color: ${c.server_color || '#3498db'}">
                            ${(c.server_name || 'U').charAt(0)}
                        </div>
                        <div class="flex-grow-1">
                            <div class="cocktail-name">${c.name}</div>
                            <div class="cocktail-meta mb-2">
                                ${c.server_name || 'Unknown'} &middot; ${formatDate(c.served_date)}
                            </div>
                            <div>
                                ${(c.ingredients || []).slice(0, 3).map(i =>
                                    `<span class="ingredient-badge">${i}</span>`
                                ).join('')}
                                ${(c.ingredients || []).length > 3 ? `<span class="ingredient-badge">+${c.ingredients.length - 3}</span>` : ''}
                            </div>
                        </div>
                        <i class="bi bi-chevron-right text-muted"></i>
                    </div>
                </div>
            </div>
        `).join('');
    },

    async renderDetail(id) {
        const app = document.getElementById('app');
        app.innerHTML = `<div class="loading"><div class="spinner-border text-primary"></div></div>`;

        try {
            const res = await fetch(`/api/cocktails/${id}`);
            if (!res.ok) throw new Error('Cocktail not found');
            this.currentCocktail = await res.json();

            app.innerHTML = `
                <div class="page-header">
                    <div class="d-flex align-items-center">
                        <button class="btn btn-link text-white p-0 me-3" onclick="window.location.hash='#/cocktails'">
                            <i class="bi bi-arrow-left fs-4"></i>
                        </button>
                        <h1 class="mb-0">${this.currentCocktail.name}</h1>
                    </div>
                </div>
                <div class="container-fluid">
                    <div class="card mb-3">
                        <div class="card-body">
                            <div class="d-flex align-items-center mb-3">
                                <div class="avatar me-3" style="background-color: ${this.currentCocktail.server_color || '#3498db'}">
                                    ${(this.currentCocktail.server_name || 'U').charAt(0)}
                                </div>
                                <div>
                                    <div class="fw-bold">${this.currentCocktail.server_name || 'Unknown'}</div>
                                    <div class="text-muted small">${formatDate(this.currentCocktail.served_date)}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="card mb-3">
                        <div class="card-header">
                            <i class="bi bi-list-check me-2"></i>Ingredients
                        </div>
                        <div class="card-body">
                            <ul class="list-unstyled mb-0">
                                ${(this.currentCocktail.ingredients || []).map(i =>
                                    `<li class="mb-2"><i class="bi bi-dot text-primary"></i> ${i}</li>`
                                ).join('')}
                            </ul>
                        </div>
                    </div>

                    ${this.currentCocktail.instructions ? `
                    <div class="card mb-3">
                        <div class="card-header">
                            <i class="bi bi-journal-text me-2"></i>Instructions
                        </div>
                        <div class="card-body">
                            <p class="mb-0">${this.currentCocktail.instructions.replace(/\n/g, '<br>')}</p>
                        </div>
                    </div>
                    ` : ''}

                    ${this.currentCocktail.notes ? `
                    <div class="card mb-3">
                        <div class="card-header">
                            <i class="bi bi-sticky me-2"></i>Notes
                        </div>
                        <div class="card-body">
                            <p class="mb-0">${this.currentCocktail.notes.replace(/\n/g, '<br>')}</p>
                        </div>
                    </div>
                    ` : ''}

                    <div class="d-flex gap-2 mt-4">
                        <button class="btn btn-outline-danger flex-grow-1" onclick="CocktailsUI.deleteCocktail(${this.currentCocktail.id})">
                            <i class="bi bi-trash me-2"></i>Delete
                        </button>
                        <button class="btn btn-primary flex-grow-1" onclick="CocktailsUI.openEditModal(${this.currentCocktail.id})">
                            <i class="bi bi-pencil me-2"></i>Edit
                        </button>
                    </div>
                </div>
            `;
        } catch (error) {
            app.innerHTML = `
                <div class="empty-state">
                    <i class="bi bi-exclamation-circle"></i>
                    <h5>Cocktail Not Found</h5>
                    <button class="btn btn-primary" onclick="window.location.hash='#/cocktails'">
                        Back to Cocktails
                    </button>
                </div>
            `;
        }
    },

    openDetail(id) {
        window.location.hash = `#/cocktails/${id}`;
    },

    openAddModal() {
        this.currentCocktail = null;
        document.getElementById('cocktailModalTitle').textContent = 'Add Cocktail';
        document.getElementById('cocktailId').value = '';
        document.getElementById('cocktailForm').reset();
        document.getElementById('cocktailDate').value = getToday();
        this.populatePlayerSelect();
        this.resetIngredients();

        const modal = new bootstrap.Modal(document.getElementById('cocktailModal'));
        modal.show();
    },

    async openEditModal(id) {
        try {
            const res = await fetch(`/api/cocktails/${id}`);
            this.currentCocktail = await res.json();

            document.getElementById('cocktailModalTitle').textContent = 'Edit Cocktail';
            document.getElementById('cocktailId').value = this.currentCocktail.id;
            document.getElementById('cocktailName').value = this.currentCocktail.name;
            document.getElementById('cocktailInstructions').value = this.currentCocktail.instructions || '';
            document.getElementById('cocktailDate').value = this.currentCocktail.served_date;
            document.getElementById('cocktailNotes').value = this.currentCocktail.notes || '';

            this.populatePlayerSelect();
            document.getElementById('cocktailServedBy').value = this.currentCocktail.served_by || '';

            this.resetIngredients(this.currentCocktail.ingredients || []);

            const modal = new bootstrap.Modal(document.getElementById('cocktailModal'));
            modal.show();
        } catch (error) {
            console.error('Failed to load cocktail:', error);
            alert('Failed to load cocktail');
        }
    },

    populatePlayerSelect() {
        const select = document.getElementById('cocktailServedBy');
        select.innerHTML = '<option value="">Select who served</option>' +
            App.players.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
    },

    resetIngredients(ingredients = ['']) {
        const container = document.getElementById('ingredientsList');
        container.innerHTML = '';
        ingredients.forEach(ing => this.addIngredientRow(ing));
        if (ingredients.length === 0) {
            this.addIngredientRow('');
        }
    },

    addIngredientRow(value = '') {
        const container = document.getElementById('ingredientsList');
        const row = document.createElement('div');
        row.className = 'ingredient-row';
        row.innerHTML = `
            <input type="text" class="form-control ingredient-input" value="${value}" placeholder="e.g., 2 oz vodka">
            <button type="button" class="btn btn-outline-danger btn-sm" onclick="this.parentElement.remove()">
                <i class="bi bi-x"></i>
            </button>
        `;
        container.appendChild(row);
    },

    getIngredients() {
        return Array.from(document.querySelectorAll('.ingredient-input'))
            .map(input => input.value.trim())
            .filter(v => v);
    },

    async saveCocktail() {
        const id = document.getElementById('cocktailId').value;
        const data = {
            name: document.getElementById('cocktailName').value,
            ingredients: this.getIngredients(),
            instructions: document.getElementById('cocktailInstructions').value,
            served_by: document.getElementById('cocktailServedBy').value || null,
            served_date: document.getElementById('cocktailDate').value,
            notes: document.getElementById('cocktailNotes').value
        };

        if (!data.name || data.ingredients.length === 0 || !data.served_date) {
            alert('Please fill in name, at least one ingredient, and date');
            return;
        }

        try {
            const url = id ? `/api/cocktails/${id}` : '/api/cocktails';
            const method = id ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (res.ok) {
                bootstrap.Modal.getInstance(document.getElementById('cocktailModal')).hide();
                if (window.location.hash.includes('/cocktails/')) {
                    const cocktail = await res.json();
                    window.location.hash = `#/cocktails/${cocktail.id}`;
                    this.renderDetail(cocktail.id);
                } else {
                    this.loadCocktails();
                }
            } else {
                const error = await res.json();
                alert(error.error || 'Failed to save cocktail');
            }
        } catch (error) {
            console.error('Failed to save cocktail:', error);
            alert('Failed to save cocktail');
        }
    },

    async deleteCocktail(id) {
        if (!confirm('Are you sure you want to delete this cocktail?')) return;

        try {
            const res = await fetch(`/api/cocktails/${id}`, { method: 'DELETE' });
            if (res.ok) {
                window.location.hash = '#/cocktails';
            } else {
                alert('Failed to delete cocktail');
            }
        } catch (error) {
            console.error('Failed to delete cocktail:', error);
            alert('Failed to delete cocktail');
        }
    }
};

// Setup event listeners when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('addIngredient').addEventListener('click', () => CocktailsUI.addIngredientRow());
    document.getElementById('saveCocktail').addEventListener('click', () => CocktailsUI.saveCocktail());
});
