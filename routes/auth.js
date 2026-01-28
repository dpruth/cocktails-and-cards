const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { db } = require('../database/db');
const { sendMagicLinkEmail } = require('../services/email');
const rateLimit = require('express-rate-limit');

// Rate limiter for login requests
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 requests per window per IP
    message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false
});

// Generate cryptographically secure token
function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

// POST /api/auth/request-magic-link
router.post('/request-magic-link', loginLimiter, async (req, res) => {
    try {
        const { email } = req.body;

        if (!email || !email.includes('@')) {
            return res.status(400).json({ error: 'Valid email address is required' });
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Check if email is associated with a player
        const player = db.prepare('SELECT * FROM players WHERE email = ?').get(normalizedEmail);

        // Generate token
        const token = generateToken();
        const expiryMinutes = parseInt(process.env.MAGIC_LINK_EXPIRY_MINUTES, 10) || 15;
        const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000).toISOString();

        // Store token in database
        db.prepare(`
            INSERT INTO magic_link_tokens (email, token, player_id, expires_at)
            VALUES (?, ?, ?, ?)
        `).run(normalizedEmail, token, player?.id || null, expiresAt);

        // Send email
        await sendMagicLinkEmail(normalizedEmail, token, player?.name);

        // Always return success to prevent email enumeration
        res.json({
            success: true,
            message: 'If this email is registered, you will receive a sign-in link shortly.'
        });
    } catch (error) {
        console.error('Magic link request error:', error);
        res.status(500).json({ error: 'Failed to process request' });
    }
});

// POST /api/auth/verify-token
router.post('/verify-token', async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ error: 'Token is required' });
        }

        // Find valid token
        const tokenRecord = db.prepare(`
            SELECT * FROM magic_link_tokens
            WHERE token = ?
            AND used_at IS NULL
            AND expires_at > datetime('now')
        `).get(token);

        if (!tokenRecord) {
            return res.status(401).json({
                error: 'Invalid or expired token',
                code: 'INVALID_TOKEN'
            });
        }

        // Mark token as used
        db.prepare('UPDATE magic_link_tokens SET used_at = datetime("now") WHERE id = ?')
            .run(tokenRecord.id);

        let player = null;

        if (tokenRecord.player_id) {
            // Existing player
            player = db.prepare('SELECT * FROM players WHERE id = ?').get(tokenRecord.player_id);
        } else {
            // New user - need to link to existing player
            return res.json({
                success: true,
                requiresSetup: true,
                email: tokenRecord.email
            });
        }

        // Create session
        req.session.playerId = player.id;
        req.session.email = tokenRecord.email;

        res.json({
            success: true,
            player: {
                id: player.id,
                name: player.name,
                email: player.email,
                avatar_color: player.avatar_color
            }
        });
    } catch (error) {
        console.error('Token verification error:', error);
        res.status(500).json({ error: 'Failed to verify token' });
    }
});

// POST /api/auth/link-player
// Links an email to an existing player (for initial setup)
router.post('/link-player', async (req, res) => {
    try {
        const { email, playerId } = req.body;

        if (!email || !playerId) {
            return res.status(400).json({ error: 'Email and player ID are required' });
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Check if player exists and doesn't have email
        const player = db.prepare('SELECT * FROM players WHERE id = ?').get(playerId);
        if (!player) {
            return res.status(404).json({ error: 'Player not found' });
        }

        if (player.email) {
            return res.status(400).json({ error: 'Player already has an email address' });
        }

        // Check if email is already used
        const existingEmail = db.prepare('SELECT id FROM players WHERE email = ?').get(normalizedEmail);
        if (existingEmail) {
            return res.status(400).json({ error: 'Email is already in use' });
        }

        // Update player with email
        db.prepare('UPDATE players SET email = ? WHERE id = ?')
            .run(normalizedEmail, playerId);

        // Create session
        req.session.playerId = player.id;
        req.session.email = normalizedEmail;

        const updatedPlayer = db.prepare('SELECT * FROM players WHERE id = ?').get(playerId);

        res.json({
            success: true,
            player: {
                id: updatedPlayer.id,
                name: updatedPlayer.name,
                email: updatedPlayer.email,
                avatar_color: updatedPlayer.avatar_color
            }
        });
    } catch (error) {
        console.error('Link player error:', error);
        res.status(500).json({ error: 'Failed to link player' });
    }
});

// GET /api/auth/me
router.get('/me', (req, res) => {
    if (!req.session || !req.session.playerId) {
        return res.json({ authenticated: false });
    }

    const player = db.prepare('SELECT id, name, email, avatar_color FROM players WHERE id = ?')
        .get(req.session.playerId);

    if (!player) {
        return res.json({ authenticated: false });
    }

    res.json({
        authenticated: true,
        player
    });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
    if (req.session) {
        req.session.destroy((err) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to logout' });
            }
            res.clearCookie('connect.sid');
            res.json({ success: true });
        });
    } else {
        res.json({ success: true });
    }
});

// GET /api/auth/players-for-linking
// Get players that don't have email addresses yet (for linking flow)
router.get('/players-for-linking', (req, res) => {
    try {
        const players = db.prepare('SELECT id, name, avatar_color FROM players WHERE email IS NULL ORDER BY name').all();
        res.json(players);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
