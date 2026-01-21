// Cocktails & Cards - Statistics UI Logic

const StatsUI = {
    leaderboard: [],
    playerStats: null,

    async render(playerId) {
        if (playerId) {
            await this.renderPlayerStats(playerId);
        } else {
            await this.renderLeaderboard();
        }
    },

    async renderLeaderboard() {
        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="page-header">
                <h1><i class="bi bi-bar-chart me-2"></i>Statistics</h1>
            </div>
            <div class="container-fluid">
                <h5 class="mb-3"><i class="bi bi-trophy me-2"></i>Leaderboard</h5>
                <div id="leaderboard">
                    <div class="loading"><div class="spinner-border text-primary"></div></div>
                </div>

                <h5 class="mt-4 mb-3"><i class="bi bi-people me-2"></i>Player Stats</h5>
                <div id="playerCards" class="row g-3">
                    <div class="loading"><div class="spinner-border text-primary"></div></div>
                </div>
            </div>
        `;

        await this.loadLeaderboard();
    },

    async loadLeaderboard() {
        try {
            const res = await fetch('/api/games/stats/leaderboard');
            this.leaderboard = await res.json();
            this.renderLeaderboardList();
            this.renderPlayerCards();
        } catch (error) {
            console.error('Failed to load leaderboard:', error);
        }
    },

    renderLeaderboardList() {
        const container = document.getElementById('leaderboard');
        if (!container) return;

        if (this.leaderboard.length === 0 || this.leaderboard.every(p => p.gamesPlayed === 0)) {
            container.innerHTML = `
                <div class="empty-state py-3">
                    <i class="bi bi-trophy"></i>
                    <p>No games played yet</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="card">
                <div class="card-body p-0">
                    ${this.leaderboard.filter(p => p.gamesPlayed > 0).map((player, index) => `
                        <div class="leaderboard-item" onclick="window.location.hash='#/stats/${player.id}'">
                            <div class="leaderboard-rank ${index < 3 ? 'top-3' : ''}">
                                ${index === 0 ? '<i class="bi bi-trophy-fill text-warning"></i>' :
                                  index === 1 ? '<i class="bi bi-trophy-fill text-secondary"></i>' :
                                  index === 2 ? '<i class="bi bi-trophy-fill" style="color: #cd7f32"></i>' :
                                  (index + 1)}
                            </div>
                            <div class="avatar me-3" style="background-color: ${player.avatar_color}">
                                ${player.name.charAt(0)}
                            </div>
                            <div class="flex-grow-1">
                                <div class="fw-bold">${player.name}</div>
                                <div class="small text-muted">${player.gamesWon}W - ${player.gamesPlayed - player.gamesWon}L</div>
                            </div>
                            <div class="text-end">
                                <div class="fw-bold text-primary">${player.winPercentage}%</div>
                                <div class="small text-muted">${player.gamesPlayed} games</div>
                            </div>
                            <i class="bi bi-chevron-right text-muted ms-2"></i>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    renderPlayerCards() {
        const container = document.getElementById('playerCards');
        if (!container) return;

        container.innerHTML = this.leaderboard.map(player => `
            <div class="col-6">
                <div class="card player-stat-card h-100" onclick="window.location.hash='#/stats/${player.id}'">
                    <div class="card-body text-center">
                        <div class="avatar avatar-lg mx-auto mb-2" style="background-color: ${player.avatar_color}">
                            ${player.name.charAt(0)}
                        </div>
                        <div class="fw-bold">${player.name}</div>
                        <div class="stat-value">${player.winPercentage}%</div>
                        <div class="stat-label">Win Rate</div>
                        <div class="mt-2 small text-muted">
                            ${player.gamesPlayed} games played
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    },

    async renderPlayerStats(playerId) {
        const app = document.getElementById('app');
        app.innerHTML = `<div class="loading"><div class="spinner-border text-primary"></div></div>`;

        try {
            const [player, stats] = await Promise.all([
                fetch(`/api/players/${playerId}`).then(r => r.json()),
                fetch(`/api/players/${playerId}/stats`).then(r => r.json())
            ]);

            this.playerStats = { ...player, ...stats };

            app.innerHTML = `
                <div class="page-header">
                    <div class="d-flex align-items-center">
                        <button class="btn btn-link text-white p-0 me-3" onclick="window.location.hash='#/stats'">
                            <i class="bi bi-arrow-left fs-4"></i>
                        </button>
                        <div class="avatar avatar-lg me-3" style="background-color: ${player.avatar_color}">
                            ${player.name.charAt(0)}
                        </div>
                        <div>
                            <h1 class="mb-0">${player.name}</h1>
                            <small class="opacity-75">Player Statistics</small>
                        </div>
                    </div>
                </div>
                <div class="container-fluid">
                    <!-- Overview Stats -->
                    <div class="row g-3 mb-4">
                        <div class="col-4">
                            <div class="stat-card card">
                                <div class="stat-value">${stats.gamesPlayed}</div>
                                <div class="stat-label">Games</div>
                            </div>
                        </div>
                        <div class="col-4">
                            <div class="stat-card card">
                                <div class="stat-value text-success">${stats.gamesWon}</div>
                                <div class="stat-label">Wins</div>
                            </div>
                        </div>
                        <div class="col-4">
                            <div class="stat-card card">
                                <div class="stat-value text-primary">${stats.winPercentage}%</div>
                                <div class="stat-label">Win Rate</div>
                            </div>
                        </div>
                    </div>

                    <!-- Bidding Stats -->
                    <div class="card mb-4">
                        <div class="card-header">
                            <i class="bi bi-bullseye me-2"></i>Bidding Statistics
                        </div>
                        <div class="card-body">
                            <div class="row g-3 text-center">
                                <div class="col-4">
                                    <div class="stat-value">${stats.bidsTotal}</div>
                                    <div class="stat-label">Total Bids</div>
                                </div>
                                <div class="col-4">
                                    <div class="stat-value text-success">${stats.bidsWon}</div>
                                    <div class="stat-label">Won</div>
                                </div>
                                <div class="col-4">
                                    <div class="stat-value text-primary">${stats.bidSuccessRate}%</div>
                                    <div class="stat-label">Success</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Suit Preferences -->
                    ${stats.suitPreferences.length > 0 ? `
                    <div class="card mb-4">
                        <div class="card-header">
                            <i class="bi bi-heart-fill me-2"></i>Suit Preferences
                        </div>
                        <div class="card-body">
                            ${stats.suitPreferences.map(s => `
                                <div class="d-flex align-items-center mb-2">
                                    <div class="me-3" style="width: 100px">${this.getSuitDisplay(s.bid_suit)}</div>
                                    <div class="flex-grow-1">
                                        <div class="progress" style="height: 20px">
                                            <div class="progress-bar ${this.getSuitColor(s.bid_suit)}"
                                                 style="width: ${(s.count / stats.bidsTotal * 100)}%">
                                                ${s.count}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    ` : ''}

                    <!-- Partnership Stats -->
                    ${stats.partnershipStats.length > 0 ? `
                    <div class="card mb-4">
                        <div class="card-header">
                            <i class="bi bi-people me-2"></i>Partnership Stats
                        </div>
                        <div class="card-body">
                            ${stats.partnershipStats.map(p => {
                                const partner = App.getPlayer(p.partner_id);
                                const winRate = p.games > 0 ? ((p.wins / p.games) * 100).toFixed(1) : 0;
                                return `
                                <div class="partnership-item">
                                    <div class="d-flex align-items-center">
                                        <div class="avatar avatar-sm me-2" style="background-color: ${partner.avatar_color}">
                                            ${partner.name.charAt(0)}
                                        </div>
                                        <span>${partner.name}</span>
                                    </div>
                                    <div class="text-end">
                                        <span class="fw-bold text-primary">${winRate}%</span>
                                        <span class="text-muted small ms-1">(${p.wins}/${p.games})</span>
                                    </div>
                                </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                    ` : ''}

                    <!-- Cocktails -->
                    <div class="card mb-4">
                        <div class="card-header">
                            <i class="bi bi-cup-straw me-2"></i>Cocktails Served
                        </div>
                        <div class="card-body text-center">
                            <div class="stat-value">${stats.cocktailsServed}</div>
                            <div class="stat-label">Total</div>
                        </div>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Failed to load player stats:', error);
            app.innerHTML = `
                <div class="empty-state">
                    <i class="bi bi-exclamation-circle"></i>
                    <h5>Player Not Found</h5>
                    <button class="btn btn-primary" onclick="window.location.hash='#/stats'">
                        Back to Stats
                    </button>
                </div>
            `;
        }
    },

    getSuitDisplay(suit) {
        const displays = {
            'spades': '<span class="suit-spades">&#9824; Spades</span>',
            'clubs': '<span class="suit-clubs">&#9827; Clubs</span>',
            'diamonds': '<span class="suit-diamonds">&#9830; Diamonds</span>',
            'hearts': '<span class="suit-hearts">&#9829; Hearts</span>',
            'no_trumps': 'No Trumps',
            'misere': 'Misere',
            'open_misere': 'Open Misere'
        };
        return displays[suit] || suit;
    },

    getSuitColor(suit) {
        const colors = {
            'spades': 'bg-dark',
            'clubs': 'bg-dark',
            'diamonds': 'bg-danger',
            'hearts': 'bg-danger',
            'no_trumps': 'bg-primary',
            'misere': 'bg-warning',
            'open_misere': 'bg-warning'
        };
        return colors[suit] || 'bg-secondary';
    }
};
