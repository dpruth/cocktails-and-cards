// Cocktails & Cards - Games UI Logic

const GamesUI = {
    games: [],
    currentGame: null,
    selectedBidder: null,

    // 500 Scoring constants
    SCORING: {
        suits: ['spades', 'clubs', 'diamonds', 'hearts', 'no_trumps'],
        points: {
            6:  [40,  60,  80,  100, 120],
            7:  [140, 160, 180, 200, 220],
            8:  [240, 260, 280, 300, 320],
            9:  [340, 360, 380, 400, 420],
            10: [440, 460, 480, 500, 520]
        },
        misere: 250,
        openMisere: 500
    },

    async render(gameId) {
        if (gameId) {
            await this.renderGame(gameId);
        } else {
            await this.renderList();
        }
    },

    async renderList() {
        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="page-header">
                <h1><i class="bi bi-suit-spade me-2"></i>Games</h1>
            </div>
            <div class="container-fluid">
                <div id="activeGames" class="mb-4"></div>
                <h5 class="mb-3">Completed Games</h5>
                <div id="completedGames">
                    <div class="loading"><div class="spinner-border text-primary"></div></div>
                </div>
            </div>
            <button class="fab" onclick="GamesUI.openNewGameModal()">
                <i class="bi bi-plus-lg"></i>
            </button>
        `;

        await this.loadGames();
    },

    async loadGames() {
        try {
            const [active, completed] = await Promise.all([
                fetch('/api/games?completed=false').then(r => r.json()),
                fetch('/api/games?completed=true').then(r => r.json())
            ]);

            this.renderActiveGames(active);
            this.renderCompletedGames(completed);
        } catch (error) {
            console.error('Failed to load games:', error);
        }
    },

    renderActiveGames(games) {
        const container = document.getElementById('activeGames');
        if (!container) return;

        if (games.length === 0) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = `
            <h5 class="mb-3">Active Games</h5>
            ${games.map(g => `
                <div class="card game-card border-primary" onclick="window.location.hash='#/games/${g.id}'">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-center">
                            <div class="text-center flex-grow-1">
                                <div class="team-label">Team 1</div>
                                <div class="team-score team1">${g.team1_score}</div>
                                <div class="small">${g.team1_player1_name} & ${g.team1_player2_name}</div>
                            </div>
                            <div class="vs-divider px-3">vs</div>
                            <div class="text-center flex-grow-1">
                                <div class="team-label">Team 2</div>
                                <div class="team-score team2">${g.team2_score}</div>
                                <div class="small">${g.team2_player1_name} & ${g.team2_player2_name}</div>
                            </div>
                        </div>
                        <div class="text-center mt-2">
                            <span class="badge bg-primary">In Progress</span>
                        </div>
                    </div>
                </div>
            `).join('')}
        `;
    },

    renderCompletedGames(games) {
        const container = document.getElementById('completedGames');
        if (!container) return;

        if (games.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="bi bi-suit-spade"></i>
                    <h5>No Completed Games</h5>
                    <p>Start a new game to track scores!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = games.map(g => `
            <div class="card game-card" onclick="window.location.hash='#/games/${g.id}'">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center">
                        <div class="text-center flex-grow-1">
                            <div class="team-label">Team 1 ${g.winner_team === 1 ? '<i class="bi bi-trophy-fill text-warning"></i>' : ''}</div>
                            <div class="team-score team1">${g.team1_score}</div>
                            <div class="small">${g.team1_player1_name} & ${g.team1_player2_name}</div>
                        </div>
                        <div class="vs-divider px-3">vs</div>
                        <div class="text-center flex-grow-1">
                            <div class="team-label">Team 2 ${g.winner_team === 2 ? '<i class="bi bi-trophy-fill text-warning"></i>' : ''}</div>
                            <div class="team-score team2">${g.team2_score}</div>
                            <div class="small">${g.team2_player1_name} & ${g.team2_player2_name}</div>
                        </div>
                    </div>
                    <div class="text-center mt-2 small text-muted">${formatDate(g.played_date)}</div>
                </div>
            </div>
        `).join('');
    },

    async renderGame(id) {
        const app = document.getElementById('app');
        app.innerHTML = `<div class="loading"><div class="spinner-border text-primary"></div></div>`;

        try {
            const res = await fetch(`/api/games/${id}`);
            if (!res.ok) throw new Error('Game not found');
            this.currentGame = await res.json();

            const isActive = !this.currentGame.completed;

            app.innerHTML = `
                <div class="page-header">
                    <div class="d-flex align-items-center">
                        <button class="btn btn-link text-white p-0 me-3" onclick="window.location.hash='#/games'">
                            <i class="bi bi-arrow-left fs-4"></i>
                        </button>
                        <h1 class="mb-0">Game ${this.currentGame.completed ? '(Completed)' : ''}</h1>
                    </div>
                </div>
                <div class="container-fluid">
                    <div class="score-display mb-4">
                        <div class="row">
                            <div class="col-5 text-center">
                                <div class="team-name">Team 1</div>
                                <div class="score" id="team1Score">${this.currentGame.team1_score}</div>
                                <div class="small opacity-75">${this.currentGame.team1_player1_name}<br>&<br>${this.currentGame.team1_player2_name}</div>
                                ${this.currentGame.winner_team === 1 ? '<div class="winner-badge mt-2"><i class="bi bi-trophy-fill me-1"></i>Winner</div>' : ''}
                            </div>
                            <div class="col-2 d-flex align-items-center justify-content-center">
                                <span class="fs-4 opacity-50">vs</span>
                            </div>
                            <div class="col-5 text-center">
                                <div class="team-name">Team 2</div>
                                <div class="score" id="team2Score">${this.currentGame.team2_score}</div>
                                <div class="small opacity-75">${this.currentGame.team2_player1_name}<br>&<br>${this.currentGame.team2_player2_name}</div>
                                ${this.currentGame.winner_team === 2 ? '<div class="winner-badge mt-2"><i class="bi bi-trophy-fill me-1"></i>Winner</div>' : ''}
                            </div>
                        </div>
                    </div>

                    ${isActive ? `
                    <div class="d-flex gap-2 mb-4">
                        <button class="btn btn-primary flex-grow-1 py-3" onclick="GamesUI.openHandModal()">
                            <i class="bi bi-plus-lg me-2"></i>Add Hand
                        </button>
                        <button class="btn btn-success flex-grow-1 py-3" onclick="GamesUI.completeGame()">
                            <i class="bi bi-check-lg me-2"></i>End Game
                        </button>
                    </div>
                    ` : ''}

                    <div class="card">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <span><i class="bi bi-list-ol me-2"></i>Hands</span>
                            <span class="badge bg-secondary">${(this.currentGame.hands || []).length}</span>
                        </div>
                        <div class="card-body p-0">
                            ${this.renderHands()}
                        </div>
                    </div>

                    ${isActive ? `
                    <div class="mt-4">
                        <button class="btn btn-outline-danger w-100" onclick="GamesUI.deleteGame(${this.currentGame.id})">
                            <i class="bi bi-trash me-2"></i>Delete Game
                        </button>
                    </div>
                    ` : ''}
                </div>
            `;
        } catch (error) {
            app.innerHTML = `
                <div class="empty-state">
                    <i class="bi bi-exclamation-circle"></i>
                    <h5>Game Not Found</h5>
                    <button class="btn btn-primary" onclick="window.location.hash='#/games'">
                        Back to Games
                    </button>
                </div>
            `;
        }
    },

    renderHands() {
        const hands = this.currentGame.hands || [];
        if (hands.length === 0) {
            return `<div class="text-center py-4 text-muted">No hands played yet</div>`;
        }

        return hands.map(h => {
            const isTeam1Bidder = [this.currentGame.team1_player1, this.currentGame.team1_player2].includes(h.bidder_id);
            return `
            <div class="hand-item">
                <div class="d-flex align-items-center">
                    <div class="hand-number me-3">${h.hand_number}</div>
                    <div class="flex-grow-1">
                        <div class="d-flex align-items-center">
                            <span class="fw-bold me-2">${h.bidder_name || 'Unknown'}</span>
                            <span class="badge ${isTeam1Bidder ? 'bg-primary' : 'bg-danger'}">Team ${isTeam1Bidder ? '1' : '2'}</span>
                        </div>
                        <div class="bid-display ${h.bid_won ? 'bid-won' : 'bid-lost'}">
                            ${h.bid_display || this.getBidDisplay(h.bid_tricks, h.bid_suit)}
                            ${h.bid_won ? '<i class="bi bi-check-circle-fill ms-1"></i>' : '<i class="bi bi-x-circle-fill ms-1"></i>'}
                        </div>
                    </div>
                    <div class="text-end">
                        <div class="small text-primary">T1: ${h.team1_hand_score >= 0 ? '+' : ''}${h.team1_hand_score}</div>
                        <div class="small text-danger">T2: ${h.team2_hand_score >= 0 ? '+' : ''}${h.team2_hand_score}</div>
                    </div>
                    ${!this.currentGame.completed ? `
                    <button class="btn btn-sm btn-outline-danger ms-2" onclick="event.stopPropagation(); GamesUI.deleteHand(${h.id})">
                        <i class="bi bi-trash"></i>
                    </button>
                    ` : ''}
                </div>
            </div>
            `;
        }).join('');
    },

    getBidDisplay(tricks, suit) {
        if (suit === 'misere') return 'Misere';
        if (suit === 'open_misere') return 'Open Misere';

        const suitSymbols = {
            'spades': '<span class="suit-spades">&#9824;</span>',
            'clubs': '<span class="suit-clubs">&#9827;</span>',
            'diamonds': '<span class="suit-diamonds">&#9830;</span>',
            'hearts': '<span class="suit-hearts">&#9829;</span>',
            'no_trumps': 'NT'
        };

        return `${tricks}${suitSymbols[suit] || suit}`;
    },

    calculateBidPoints(tricks, suit) {
        if (suit === 'misere') return this.SCORING.misere;
        if (suit === 'open_misere') return this.SCORING.openMisere;

        const suitIndex = this.SCORING.suits.indexOf(suit);
        if (suitIndex === -1 || tricks < 6 || tricks > 10) return 0;

        return this.SCORING.points[tricks][suitIndex];
    },

    openNewGameModal() {
        document.getElementById('gameDate').value = getToday();
        this.populatePlayerSelects();
        const modal = new bootstrap.Modal(document.getElementById('newGameModal'));
        modal.show();
    },

    populatePlayerSelects() {
        const selects = ['team1Player1', 'team1Player2', 'team2Player1', 'team2Player2'];
        const options = '<option value="">Select player</option>' +
            App.players.map(p => `<option value="${p.id}">${p.name}</option>`).join('');

        selects.forEach(id => {
            document.getElementById(id).innerHTML = options;
        });
    },

    async startGame() {
        const data = {
            played_date: document.getElementById('gameDate').value,
            team1_player1: parseInt(document.getElementById('team1Player1').value),
            team1_player2: parseInt(document.getElementById('team1Player2').value),
            team2_player1: parseInt(document.getElementById('team2Player1').value),
            team2_player2: parseInt(document.getElementById('team2Player2').value)
        };

        // Validate all players selected
        if (!data.team1_player1 || !data.team1_player2 || !data.team2_player1 || !data.team2_player2) {
            alert('Please select all 4 players');
            return;
        }

        // Validate all different
        const players = [data.team1_player1, data.team1_player2, data.team2_player1, data.team2_player2];
        if (new Set(players).size !== 4) {
            alert('All players must be different');
            return;
        }

        try {
            const res = await fetch('/api/games', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (res.ok) {
                const game = await res.json();
                bootstrap.Modal.getInstance(document.getElementById('newGameModal')).hide();
                window.location.hash = `#/games/${game.id}`;
            } else {
                const error = await res.json();
                alert(error.error || 'Failed to start game');
            }
        } catch (error) {
            console.error('Failed to start game:', error);
            alert('Failed to start game');
        }
    },

    openHandModal() {
        if (!this.currentGame) return;

        this.selectedBidder = null;

        // Populate bidder selection
        const bidderContainer = document.getElementById('bidderSelection');
        const allPlayers = [
            { id: this.currentGame.team1_player1, name: this.currentGame.team1_player1_name, color: this.currentGame.team1_player1_color, team: 1 },
            { id: this.currentGame.team1_player2, name: this.currentGame.team1_player2_name, color: this.currentGame.team1_player2_color, team: 1 },
            { id: this.currentGame.team2_player1, name: this.currentGame.team2_player1_name, color: this.currentGame.team2_player1_color, team: 2 },
            { id: this.currentGame.team2_player2, name: this.currentGame.team2_player2_name, color: this.currentGame.team2_player2_color, team: 2 }
        ];

        bidderContainer.innerHTML = allPlayers.map(p => `
            <button type="button" class="player-select-btn" data-player-id="${p.id}" onclick="GamesUI.selectBidder(${p.id}, this)">
                <span class="badge ${p.team === 1 ? 'bg-primary' : 'bg-danger'} me-1">T${p.team}</span>
                ${p.name}
            </button>
        `).join('');

        // Reset form
        document.getElementById('bidTricks').value = '6';
        document.getElementById('bidSuit').value = 'spades';
        document.getElementById('bidWon').checked = true;
        document.getElementById('opponentTricks').value = '0';
        this.updateBidPreview();

        const modal = new bootstrap.Modal(document.getElementById('handModal'));
        modal.show();
    },

    selectBidder(playerId, btn) {
        this.selectedBidder = playerId;
        document.querySelectorAll('#bidderSelection .player-select-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
    },

    updateBidPreview() {
        const tricks = parseInt(document.getElementById('bidTricks').value);
        const suit = document.getElementById('bidSuit').value;
        const points = this.calculateBidPoints(tricks, suit);
        document.getElementById('bidPointsPreview').textContent = `Points: ${points}`;
    },

    async saveHand() {
        if (!this.selectedBidder) {
            alert('Please select a bidder');
            return;
        }

        const data = {
            bidder_id: this.selectedBidder,
            bid_tricks: parseInt(document.getElementById('bidTricks').value),
            bid_suit: document.getElementById('bidSuit').value,
            bid_won: document.getElementById('bidWon').checked,
            opponent_tricks: parseInt(document.getElementById('opponentTricks').value) || 0
        };

        try {
            const res = await fetch(`/api/games/${this.currentGame.id}/hands`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (res.ok) {
                bootstrap.Modal.getInstance(document.getElementById('handModal')).hide();
                this.renderGame(this.currentGame.id);
            } else {
                const error = await res.json();
                alert(error.error || 'Failed to save hand');
            }
        } catch (error) {
            console.error('Failed to save hand:', error);
            alert('Failed to save hand');
        }
    },

    async deleteHand(handId) {
        if (!confirm('Delete this hand?')) return;

        try {
            const res = await fetch(`/api/games/${this.currentGame.id}/hands/${handId}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                this.renderGame(this.currentGame.id);
            } else {
                alert('Failed to delete hand');
            }
        } catch (error) {
            console.error('Failed to delete hand:', error);
            alert('Failed to delete hand');
        }
    },

    async completeGame() {
        if (!confirm('End this game? The team with the highest score (or first to 500) wins.')) return;

        try {
            const res = await fetch(`/api/games/${this.currentGame.id}/complete`, {
                method: 'POST'
            });

            if (res.ok) {
                this.renderGame(this.currentGame.id);
            } else {
                alert('Failed to complete game');
            }
        } catch (error) {
            console.error('Failed to complete game:', error);
            alert('Failed to complete game');
        }
    },

    async deleteGame(id) {
        if (!confirm('Are you sure you want to delete this game?')) return;

        try {
            const res = await fetch(`/api/games/${id}`, { method: 'DELETE' });
            if (res.ok) {
                window.location.hash = '#/games';
            } else {
                alert('Failed to delete game');
            }
        } catch (error) {
            console.error('Failed to delete game:', error);
            alert('Failed to delete game');
        }
    }
};

// Setup event listeners when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('startGame').addEventListener('click', () => GamesUI.startGame());
    document.getElementById('saveHand').addEventListener('click', () => GamesUI.saveHand());

    // Bid preview updates
    document.getElementById('bidTricks').addEventListener('change', () => GamesUI.updateBidPreview());
    document.getElementById('bidSuit').addEventListener('change', () => GamesUI.updateBidPreview());
});
