const { db } = require('../database/db');

// Middleware to require authentication
function requireAuth(req, res, next) {
    if (!req.session || !req.session.playerId) {
        return res.status(401).json({
            error: 'Authentication required',
            code: 'UNAUTHENTICATED'
        });
    }

    // Attach player to request for convenience
    const player = db.prepare('SELECT * FROM players WHERE id = ?')
        .get(req.session.playerId);

    if (!player) {
        req.session.destroy(() => {});
        return res.status(401).json({
            error: 'Player not found',
            code: 'INVALID_SESSION'
        });
    }

    req.player = player;
    next();
}

module.exports = { requireAuth };
