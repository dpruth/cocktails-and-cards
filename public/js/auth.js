// Authentication module for Cocktails & Cards
const Auth = {
    currentPlayer: null,
    isAuthenticated: false,

    async init() {
        await this.checkAuthStatus();
    },

    async checkAuthStatus() {
        try {
            const res = await fetch('/api/auth/me', {
                credentials: 'include'
            });
            const data = await res.json();

            this.isAuthenticated = data.authenticated;
            this.currentPlayer = data.player || null;

            return data;
        } catch (error) {
            console.error('Auth check failed:', error);
            this.isAuthenticated = false;
            this.currentPlayer = null;
            return { authenticated: false };
        }
    },

    async requestMagicLink(email) {
        const res = await fetch('/api/auth/request-magic-link', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
            credentials: 'include'
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to send magic link');
        }

        return res.json();
    },

    async verifyToken(token) {
        const res = await fetch('/api/auth/verify-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
            credentials: 'include'
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Token verification failed');
        }

        if (data.success && data.player) {
            this.isAuthenticated = true;
            this.currentPlayer = data.player;
        }

        return data;
    },

    async linkPlayer(email, playerId) {
        const res = await fetch('/api/auth/link-player', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, playerId }),
            credentials: 'include'
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Failed to link player');
        }

        if (data.success && data.player) {
            this.isAuthenticated = true;
            this.currentPlayer = data.player;
        }

        return data;
    },

    async logout() {
        try {
            await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
        } finally {
            this.isAuthenticated = false;
            this.currentPlayer = null;
            window.location.hash = '#/login';
        }
    },

    // Render login screen
    renderLogin() {
        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="login-container">
                <div class="login-header">
                    <h1><i class="bi bi-cup-straw me-2"></i>Cocktails & Cards</h1>
                </div>
                <div class="container-fluid">
                    <div class="card mt-4">
                        <div class="card-body p-4">
                            <h4 class="text-center mb-4">Sign In</h4>
                            <form id="loginForm">
                                <div class="mb-3">
                                    <label for="loginEmail" class="form-label">Email Address</label>
                                    <input type="email" class="form-control" id="loginEmail"
                                           placeholder="Enter your email" required autocomplete="email">
                                </div>
                                <button type="submit" class="btn btn-primary w-100 py-2" id="loginBtn">
                                    <i class="bi bi-envelope me-2"></i>Send Magic Link
                                </button>
                            </form>
                            <div id="loginMessage" class="mt-3 text-center" style="display: none;"></div>
                        </div>
                    </div>
                    <p class="text-center text-muted mt-4 small">
                        Enter your email to receive a sign-in link.<br>
                        No password needed!
                    </p>
                </div>
            </div>
        `;

        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const btn = document.getElementById('loginBtn');
            const messageDiv = document.getElementById('loginMessage');

            btn.disabled = true;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Sending...';

            try {
                await this.requestMagicLink(email);
                messageDiv.className = 'mt-3 text-center alert alert-success';
                messageDiv.innerHTML = '<i class="bi bi-check-circle me-2"></i>Check your email for the sign-in link!';
                messageDiv.style.display = 'block';
            } catch (error) {
                messageDiv.className = 'mt-3 text-center alert alert-danger';
                messageDiv.textContent = error.message;
                messageDiv.style.display = 'block';
                btn.disabled = false;
                btn.innerHTML = '<i class="bi bi-envelope me-2"></i>Send Magic Link';
            }
        });
    },

    // Render token verification / player linking
    async renderVerify(token) {
        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="verify-container">
                <div class="login-header">
                    <h1><i class="bi bi-cup-straw me-2"></i>Cocktails & Cards</h1>
                </div>
                <div class="container-fluid">
                    <div class="card mt-4">
                        <div class="card-body text-center p-4">
                            <div class="spinner-border text-primary mb-3"></div>
                            <p>Verifying your sign-in link...</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        try {
            const result = await this.verifyToken(token);

            if (result.requiresSetup) {
                // Show player selection for linking email
                await this.renderPlayerLinking(result.email);
            } else if (result.success) {
                // Redirect to home
                window.location.hash = '#/';
            }
        } catch (error) {
            app.innerHTML = `
                <div class="verify-container">
                    <div class="login-header">
                        <h1><i class="bi bi-cup-straw me-2"></i>Cocktails & Cards</h1>
                    </div>
                    <div class="container-fluid">
                        <div class="card mt-4">
                            <div class="card-body text-center p-4">
                                <i class="bi bi-x-circle text-danger" style="font-size: 3rem;"></i>
                                <h5 class="mt-3">Verification Failed</h5>
                                <p class="text-muted">${error.message}</p>
                                <a href="#/login" class="btn btn-primary">
                                    <i class="bi bi-arrow-left me-2"></i>Back to Login
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
    },

    // Render player selection for first-time linking
    async renderPlayerLinking(email) {
        // Fetch available players (those without email)
        try {
            const res = await fetch('/api/auth/players-for-linking', {
                credentials: 'include'
            });
            const availablePlayers = await res.json();

            const app = document.getElementById('app');
            app.innerHTML = `
                <div class="setup-container">
                    <div class="login-header">
                        <h1><i class="bi bi-cup-straw me-2"></i>Cocktails & Cards</h1>
                    </div>
                    <div class="container-fluid">
                        <div class="card mt-4">
                            <div class="card-body p-4">
                                <h4 class="text-center mb-3">Welcome!</h4>
                                <p class="text-center text-muted mb-4">
                                    Select your player profile to link with<br><strong>${email}</strong>
                                </p>
                                <div class="row g-3" id="playerSelection">
                                    ${availablePlayers.length > 0 ? availablePlayers.map(p => `
                                        <div class="col-6">
                                            <div class="card player-link-card" data-player-id="${p.id}">
                                                <div class="card-body text-center py-3">
                                                    <div class="avatar mx-auto mb-2" style="background-color: ${p.avatar_color}">
                                                        ${p.name.charAt(0)}
                                                    </div>
                                                    <div class="fw-bold">${p.name}</div>
                                                </div>
                                            </div>
                                        </div>
                                    `).join('') : `
                                        <div class="col-12">
                                            <div class="alert alert-warning text-center">
                                                All players have been linked to email addresses.<br>
                                                Please contact an administrator.
                                            </div>
                                            <a href="#/login" class="btn btn-secondary w-100">
                                                <i class="bi bi-arrow-left me-2"></i>Back to Login
                                            </a>
                                        </div>
                                    `}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Add click handlers
            document.querySelectorAll('.player-link-card').forEach(card => {
                card.addEventListener('click', async () => {
                    const playerId = card.dataset.playerId;
                    card.classList.add('selected');
                    card.innerHTML = `
                        <div class="card-body text-center py-3">
                            <div class="spinner-border spinner-border-sm text-primary"></div>
                        </div>
                    `;

                    try {
                        await this.linkPlayer(email, parseInt(playerId, 10));
                        window.location.hash = '#/';
                    } catch (error) {
                        alert(error.message);
                        window.location.hash = '#/login';
                    }
                });
            });
        } catch (error) {
            console.error('Failed to load players:', error);
        }
    }
};
