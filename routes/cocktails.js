const express = require('express');
const router = express.Router();
const { db } = require('../database/db');

// Get all cocktails
router.get('/', (req, res) => {
    try {
        const { search, served_by } = req.query;
        let sql = `
            SELECT c.*, p.name as server_name, p.avatar_color as server_color
            FROM cocktails c
            LEFT JOIN players p ON c.served_by = p.id
        `;
        const params = [];
        const conditions = [];

        if (search) {
            conditions.push(`(c.name LIKE ? OR c.ingredients LIKE ?)`);
            params.push(`%${search}%`, `%${search}%`);
        }

        if (served_by) {
            conditions.push(`c.served_by = ?`);
            params.push(served_by);
        }

        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }

        sql += ' ORDER BY c.served_date DESC, c.created_at DESC';

        const cocktails = db.prepare(sql).all(...params);

        // Parse ingredients JSON
        cocktails.forEach(c => {
            try {
                c.ingredients = JSON.parse(c.ingredients);
            } catch {
                c.ingredients = [];
            }
        });

        res.json(cocktails);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get single cocktail
router.get('/:id', (req, res) => {
    try {
        const cocktail = db.prepare(`
            SELECT c.*, p.name as server_name, p.avatar_color as server_color
            FROM cocktails c
            LEFT JOIN players p ON c.served_by = p.id
            WHERE c.id = ?
        `).get(req.params.id);

        if (!cocktail) {
            return res.status(404).json({ error: 'Cocktail not found' });
        }

        try {
            cocktail.ingredients = JSON.parse(cocktail.ingredients);
        } catch {
            cocktail.ingredients = [];
        }

        res.json(cocktail);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create cocktail
router.post('/', (req, res) => {
    try {
        const { name, ingredients, instructions, served_by, served_date, image_url, notes } = req.body;

        if (!name || !ingredients || !served_date) {
            return res.status(400).json({ error: 'Name, ingredients, and served_date are required' });
        }

        const ingredientsJson = JSON.stringify(ingredients);

        const stmt = db.prepare(`
            INSERT INTO cocktails (name, ingredients, instructions, served_by, served_date, image_url, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(name, ingredientsJson, instructions, served_by, served_date, image_url, notes);

        const cocktail = db.prepare('SELECT * FROM cocktails WHERE id = ?').get(result.lastInsertRowid);
        cocktail.ingredients = JSON.parse(cocktail.ingredients);

        res.status(201).json(cocktail);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update cocktail
router.put('/:id', (req, res) => {
    try {
        const { name, ingredients, instructions, served_by, served_date, image_url, notes } = req.body;

        const ingredientsJson = JSON.stringify(ingredients);

        const stmt = db.prepare(`
            UPDATE cocktails
            SET name = ?, ingredients = ?, instructions = ?, served_by = ?, served_date = ?, image_url = ?, notes = ?
            WHERE id = ?
        `);

        const result = stmt.run(name, ingredientsJson, instructions, served_by, served_date, image_url, notes, req.params.id);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Cocktail not found' });
        }

        const cocktail = db.prepare('SELECT * FROM cocktails WHERE id = ?').get(req.params.id);
        cocktail.ingredients = JSON.parse(cocktail.ingredients);

        res.json(cocktail);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete cocktail
router.delete('/:id', (req, res) => {
    try {
        const result = db.prepare('DELETE FROM cocktails WHERE id = ?').run(req.params.id);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Cocktail not found' });
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get recent cocktails (for dashboard)
router.get('/recent/list', (req, res) => {
    try {
        const limit = req.query.limit || 5;
        const cocktails = db.prepare(`
            SELECT c.*, p.name as server_name, p.avatar_color as server_color
            FROM cocktails c
            LEFT JOIN players p ON c.served_by = p.id
            ORDER BY c.served_date DESC, c.created_at DESC
            LIMIT ?
        `).all(limit);

        cocktails.forEach(c => {
            try {
                c.ingredients = JSON.parse(c.ingredients);
            } catch {
                c.ingredients = [];
            }
        });

        res.json(cocktails);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
