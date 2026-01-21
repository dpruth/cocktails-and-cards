// Cocktails & Cards - Main App Logic

const App = {
    players: [],
    currentPage: 'home',

    async init() {
        await this.loadPlayers();
        this.setupRouting();
        this.setupNavigation();
        this.handleRoute();
    },

    async loadPlayers() {
        try {
            const res = await fetch('/api/players');
            this.players = await res.json();
        } catch (error) {
            console.error('Failed to load players:', error);
        }
    },

    setupRouting() {
        window.addEventListener('hashchange', () => this.handleRoute());
    },

    setupNavigation() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                this.setActiveNav(e.currentTarget.dataset.page);
            });
        });
    },

    setActiveNav(page) {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.page === page);
        });
        this.currentPage = page;
    },

    handleRoute() {
        const hash = window.location.hash || '#/';
        const [path, ...params] = hash.slice(2).split('/');

        switch (path) {
            case '':
            case 'home':
                this.setActiveNav('home');
                this.renderHome();
                break;
            case 'cocktails':
                this.setActiveNav('cocktails');
                CocktailsUI.render(params[0]);
                break;
            case 'games':
                this.setActiveNav('games');
                GamesUI.render(params[0]);
                break;
            case 'stats':
                this.setActiveNav('stats');
                StatsUI.render(params[0]);
                break;
            default:
                this.setActiveNav('home');
                this.renderHome();
        }
    },

    async renderHome() {
        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="page-header">
                <h1><i class="bi bi-cup-straw me-2"></i>Cocktails & Cards</h1>
            </div>
            <div class="container-fluid">
                <div class="row g-3 mb-4">
                    <div class="col-6">
                        <div class="quick-stat">
                            <div class="quick-stat-icon text-primary"><i class="bi bi-cup-straw"></i></div>
                            <div class="quick-stat-value" id="totalCocktails">-</div>
                            <div class="quick-stat-label">Cocktails</div>
                        </div>
                    </div>
                    <div class="col-6">
                        <div class="quick-stat">
                            <div class="quick-stat-icon text-danger"><i class="bi bi-suit-spade-fill"></i></div>
                            <div class="quick-stat-value" id="totalGames">-</div>
                            <div class="quick-stat-label">Games Played</div>
                        </div>
                    </div>
                </div>

                <div class="row g-3 mb-4">
                    <div class="col-6">
                        <button class="btn btn-primary w-100 py-3" onclick="CocktailsUI.openAddModal()">
                            <i class="bi bi-plus-lg me-2"></i>Add Cocktail
                        </button>
                    </div>
                    <div class="col-6">
                        <button class="btn btn-danger w-100 py-3" onclick="GamesUI.openNewGameModal()">
                            <i class="bi bi-plus-lg me-2"></i>New Game
                        </button>
                    </div>
                </div>

                <h5 class="mb-3">Recent Cocktails</h5>
                <div id="recentCocktails" class="mb-4">
                    <div class="loading"><div class="spinner-border text-primary"></div></div>
                </div>

                <h5 class="mb-3">Recent Games</h5>
                <div id="recentGames" class="mb-4">
                    <div class="loading"><div class="spinner-border text-primary"></div></div>
                </div>

                <h5 class="mb-3">Players</h5>
                <div id="playersList" class="row g-2 mb-4">
                    ${this.players.map(p => `
                        <div class="col-4">
                            <div class="card text-center p-2" onclick="App.openPlayerModal(${p.id})">
                                <div class="avatar mx-auto mb-2" style="background-color: ${p.avatar_color}">
                                    ${p.name.charAt(0)}
                                </div>
                                <div class="small fw-bold">${p.name}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        this.loadHomeStats();
    },

    async loadHomeStats() {
        try {
            // Load cocktails count
            const cocktails = await fetch('/api/cocktails').then(r => r.json());
            document.getElementById('totalCocktails').textContent = cocktails.length;

            // Load games count
            const games = await fetch('/api/games?completed=true').then(r => r.json());
            document.getElementById('totalGames').textContent = games.length;

            // Load recent cocktails
            const recentCocktails = await fetch('/api/cocktails/recent/list?limit=3').then(r => r.json());
            const cocktailsContainer = document.getElementById('recentCocktails');
            if (recentCocktails.length === 0) {
                cocktailsContainer.innerHTML = `
                    <div class="empty-state py-3">
                        <i class="bi bi-cup-straw"></i>
                        <p class="mb-0">No cocktails yet</p>
                    </div>
                `;
            } else {
                cocktailsContainer.innerHTML = recentCocktails.map(c => `
                    <div class="card cocktail-card" onclick="CocktailsUI.openDetail(${c.id})">
                        <div class="card-body d-flex align-items-center">
                            <div class="avatar me-3" style="background-color: ${c.server_color || '#3498db'}">
                                ${(c.server_name || 'U').charAt(0)}
                            </div>
                            <div class="flex-grow-1">
                                <div class="cocktail-name">${c.name}</div>
                                <div class="cocktail-meta">
                                    ${c.server_name || 'Unknown'} &middot; ${formatDate(c.served_date)}
                                </div>
                            </div>
                            <i class="bi bi-chevron-right text-muted"></i>
                        </div>
                    </div>
                `).join('');
            }

            // Load recent games
            const recentGames = await fetch('/api/games/recent/list?limit=3').then(r => r.json());
            const gamesContainer = document.getElementById('recentGames');
            if (recentGames.length === 0) {
                gamesContainer.innerHTML = `
                    <div class="empty-state py-3">
                        <i class="bi bi-suit-spade"></i>
                        <p class="mb-0">No games yet</p>
                    </div>
                `;
            } else {
                gamesContainer.innerHTML = recentGames.map(g => `
                    <div class="card game-card" onclick="window.location.hash='#/games/${g.id}'">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-center">
                                <div class="text-center flex-grow-1">
                                    <div class="team-label">Team 1${g.winner_team === 1 ? ' <i class="bi bi-trophy-fill text-warning"></i>' : ''}</div>
                                    <div class="team-score team1">${g.team1_score}</div>
                                    <div class="small">${g.team1_player1_name} & ${g.team1_player2_name}</div>
                                </div>
                                <div class="vs-divider px-3">vs</div>
                                <div class="text-center flex-grow-1">
                                    <div class="team-label">Team 2${g.winner_team === 2 ? ' <i class="bi bi-trophy-fill text-warning"></i>' : ''}</div>
                                    <div class="team-score team2">${g.team2_score}</div>
                                    <div class="small">${g.team2_player1_name} & ${g.team2_player2_name}</div>
                                </div>
                            </div>
                            <div class="text-center mt-2 small text-muted">${formatDate(g.played_date)}</div>
                        </div>
                    </div>
                `).join('');
            }
        } catch (error) {
            console.error('Failed to load home stats:', error);
        }
    },

    openPlayerModal(playerId) {
        const player = this.players.find(p => p.id === playerId);
        if (!player) return;

        document.getElementById('playerId').value = player.id;
        document.getElementById('playerName').value = player.name;
        document.getElementById('playerColor').value = player.avatar_color;

        const modal = new bootstrap.Modal(document.getElementById('playerModal'));
        modal.show();
    },

    async savePlayer() {
        const id = document.getElementById('playerId').value;
        const name = document.getElementById('playerName').value;
        const avatar_color = document.getElementById('playerColor').value;

        try {
            const res = await fetch(`/api/players/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, avatar_color })
            });

            if (res.ok) {
                await this.loadPlayers();
                bootstrap.Modal.getInstance(document.getElementById('playerModal')).hide();
                this.handleRoute(); // Refresh current page
            }
        } catch (error) {
            console.error('Failed to save player:', error);
            alert('Failed to save player');
        }
    },

    getPlayer(id) {
        return this.players.find(p => p.id === id) || { name: 'Unknown', avatar_color: '#999' };
    }
};

// Utility functions
function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getToday() {
    return new Date().toISOString().split('T')[0];
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    App.init();

    // Setup player save button
    document.getElementById('savePlayer').addEventListener('click', () => App.savePlayer());
});
