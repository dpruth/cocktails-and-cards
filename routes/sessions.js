const express = require('express');
const router = express.Router();
const { db } = require('../database/db');

// Get all sessions
router.get('/', (req, res) => {
    try {
        const sessions = db.prepare(`
            SELECT s.*, p.name as host_name, p.avatar_color as host_color,
                   (SELECT COUNT(*) FROM cocktail_servings WHERE session_id = s.id) as cocktail_count
            FROM cnc_sessions s
            LEFT JOIN players p ON s.host_id = p.id
            ORDER BY s.session_date DESC, s.created_at DESC
        `).all();

        res.json(sessions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get recent sessions (for dashboard)
router.get('/recent/list', (req, res) => {
    try {
        const limit = req.query.limit || 5;
        const sessions = db.prepare(`
            SELECT s.*, p.name as host_name, p.avatar_color as host_color,
                   (SELECT COUNT(*) FROM cocktail_servings WHERE session_id = s.id) as cocktail_count
            FROM cnc_sessions s
            LEFT JOIN players p ON s.host_id = p.id
            ORDER BY s.session_date DESC, s.created_at DESC
            LIMIT ?
        `).all(limit);

        res.json(sessions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get single session with cocktails
router.get('/:id', (req, res) => {
    try {
        const session = db.prepare(`
            SELECT s.*, p.name as host_name, p.avatar_color as host_color
            FROM cnc_sessions s
            LEFT JOIN players p ON s.host_id = p.id
            WHERE s.id = ?
        `).get(req.params.id);

        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        // Get cocktails served at this session
        const servings = db.prepare(`
            SELECT cs.*, c.name as cocktail_name, c.ingredients,
                   p.name as server_name, p.avatar_color as server_color
            FROM cocktail_servings cs
            JOIN cocktails c ON cs.cocktail_id = c.id
            LEFT JOIN players p ON cs.served_by = p.id
            WHERE cs.session_id = ?
            ORDER BY cs.created_at ASC
        `).all(req.params.id);

        // Parse ingredients
        servings.forEach(s => {
            try {
                s.ingredients = JSON.parse(s.ingredients);
            } catch {
                s.ingredients = [];
            }
        });

        session.servings = servings;
        res.json(session);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create session
router.post('/', (req, res) => {
    try {
        const { session_date, host_id, theme, notes } = req.body;

        if (!session_date) {
            return res.status(400).json({ error: 'Session date is required' });
        }

        const stmt = db.prepare(`
            INSERT INTO cnc_sessions (session_date, host_id, theme, notes)
            VALUES (?, ?, ?, ?)
        `);

        const result = stmt.run(session_date, host_id || null, theme || null, notes || null);

        const session = db.prepare(`
            SELECT s.*, p.name as host_name, p.avatar_color as host_color
            FROM cnc_sessions s
            LEFT JOIN players p ON s.host_id = p.id
            WHERE s.id = ?
        `).get(result.lastInsertRowid);

        res.status(201).json(session);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update session
router.put('/:id', (req, res) => {
    try {
        const { session_date, host_id, theme, notes } = req.body;

        const stmt = db.prepare(`
            UPDATE cnc_sessions
            SET session_date = ?, host_id = ?, theme = ?, notes = ?
            WHERE id = ?
        `);

        const result = stmt.run(session_date, host_id || null, theme || null, notes || null, req.params.id);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Session not found' });
        }

        const session = db.prepare(`
            SELECT s.*, p.name as host_name, p.avatar_color as host_color
            FROM cnc_sessions s
            LEFT JOIN players p ON s.host_id = p.id
            WHERE s.id = ?
        `).get(req.params.id);

        res.json(session);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete session
router.delete('/:id', (req, res) => {
    try {
        const result = db.prepare('DELETE FROM cnc_sessions WHERE id = ?').run(req.params.id);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Session not found' });
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add cocktail to session
router.post('/:id/cocktails', (req, res) => {
    try {
        const { cocktail_id, served_by, notes } = req.body;
        const session_id = req.params.id;

        if (!cocktail_id) {
            return res.status(400).json({ error: 'Cocktail ID is required' });
        }

        // Verify session exists
        const session = db.prepare('SELECT id FROM cnc_sessions WHERE id = ?').get(session_id);
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        // Verify cocktail exists
        const cocktail = db.prepare('SELECT id FROM cocktails WHERE id = ?').get(cocktail_id);
        if (!cocktail) {
            return res.status(404).json({ error: 'Cocktail not found' });
        }

        const stmt = db.prepare(`
            INSERT INTO cocktail_servings (session_id, cocktail_id, served_by, notes)
            VALUES (?, ?, ?, ?)
        `);

        const result = stmt.run(session_id, cocktail_id, served_by || null, notes || null);

        const serving = db.prepare(`
            SELECT cs.*, c.name as cocktail_name, c.ingredients,
                   p.name as server_name, p.avatar_color as server_color
            FROM cocktail_servings cs
            JOIN cocktails c ON cs.cocktail_id = c.id
            LEFT JOIN players p ON cs.served_by = p.id
            WHERE cs.id = ?
        `).get(result.lastInsertRowid);

        try {
            serving.ingredients = JSON.parse(serving.ingredients);
        } catch {
            serving.ingredients = [];
        }

        res.status(201).json(serving);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Remove cocktail serving from session
router.delete('/:id/cocktails/:servingId', (req, res) => {
    try {
        const result = db.prepare(`
            DELETE FROM cocktail_servings
            WHERE id = ? AND session_id = ?
        `).run(req.params.servingId, req.params.id);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Serving not found' });
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
