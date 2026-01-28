const express = require('express');
const router = express.Router();
const { db } = require('../database/db');

// Get all players
router.get('/', (req, res) => {
    try {
        const players = db.prepare('SELECT * FROM players ORDER BY id').all();
        res.json(players);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get single player
router.get('/:id', (req, res) => {
    try {
        const player = db.prepare('SELECT * FROM players WHERE id = ?').get(req.params.id);
        if (!player) {
            return res.status(404).json({ error: 'Player not found' });
        }
        res.json(player);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update player
router.put('/:id', (req, res) => {
    try {
        const { name, avatar_color, email } = req.body;
        const playerId = parseInt(req.params.id, 10);

        // Users can only update their own profile
        if (req.player.id !== playerId) {
            return res.status(403).json({ error: 'You can only update your own profile' });
        }

        // Check email uniqueness if provided and changed
        if (email) {
            const normalizedEmail = email.toLowerCase().trim();
            const existingEmail = db.prepare('SELECT id FROM players WHERE email = ? AND id != ?')
                .get(normalizedEmail, playerId);
            if (existingEmail) {
                return res.status(400).json({ error: 'Email is already in use' });
            }
        }

        const stmt = db.prepare('UPDATE players SET name = ?, avatar_color = ?, email = ? WHERE id = ?');
        const result = stmt.run(
            name,
            avatar_color,
            email ? email.toLowerCase().trim() : null,
            playerId
        );

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Player not found' });
        }

        const player = db.prepare('SELECT * FROM players WHERE id = ?').get(playerId);
        res.json(player);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get player statistics
router.get('/:id/stats', (req, res) => {
    try {
        const playerId = req.params.id;

        // Games won (as part of winning team)
        const gamesWon = db.prepare(`
            SELECT COUNT(*) as count FROM games
            WHERE completed = 1 AND (
                (winner_team = 1 AND (team1_player1 = ? OR team1_player2 = ?)) OR
                (winner_team = 2 AND (team2_player1 = ? OR team2_player2 = ?))
            )
        `).get(playerId, playerId, playerId, playerId);

        // Games lost
        const gamesLost = db.prepare(`
            SELECT COUNT(*) as count FROM games
            WHERE completed = 1 AND (
                (winner_team = 2 AND (team1_player1 = ? OR team1_player2 = ?)) OR
                (winner_team = 1 AND (team2_player1 = ? OR team2_player2 = ?))
            )
        `).get(playerId, playerId, playerId, playerId);

        // Total games played
        const gamesPlayed = db.prepare(`
            SELECT COUNT(*) as count FROM games
            WHERE completed = 1 AND (
                team1_player1 = ? OR team1_player2 = ? OR
                team2_player1 = ? OR team2_player2 = ?
            )
        `).get(playerId, playerId, playerId, playerId);

        // Bids made
        const bidsTotal = db.prepare(`
            SELECT COUNT(*) as count FROM hands WHERE bidder_id = ?
        `).get(playerId);

        // Bids won
        const bidsWon = db.prepare(`
            SELECT COUNT(*) as count FROM hands WHERE bidder_id = ? AND bid_won = 1
        `).get(playerId);

        // Suit preferences
        const suitStats = db.prepare(`
            SELECT bid_suit, COUNT(*) as count
            FROM hands
            WHERE bidder_id = ?
            GROUP BY bid_suit
            ORDER BY count DESC
        `).all(playerId);

        // Cocktails served
        const cocktailsServed = db.prepare(`
            SELECT COUNT(*) as count FROM cocktails WHERE served_by = ?
        `).get(playerId);

        // Partnership stats
        const partnershipStats = db.prepare(`
            SELECT
                CASE
                    WHEN team1_player1 = ? THEN team1_player2
                    WHEN team1_player2 = ? THEN team1_player1
                    WHEN team2_player1 = ? THEN team2_player2
                    WHEN team2_player2 = ? THEN team2_player1
                END as partner_id,
                SUM(CASE
                    WHEN (team1_player1 = ? OR team1_player2 = ?) AND winner_team = 1 THEN 1
                    WHEN (team2_player1 = ? OR team2_player2 = ?) AND winner_team = 2 THEN 1
                    ELSE 0
                END) as wins,
                COUNT(*) as games
            FROM games
            WHERE completed = 1 AND (
                team1_player1 = ? OR team1_player2 = ? OR
                team2_player1 = ? OR team2_player2 = ?
            )
            GROUP BY partner_id
        `).all(playerId, playerId, playerId, playerId, playerId, playerId, playerId, playerId, playerId, playerId, playerId, playerId);

        res.json({
            gamesPlayed: gamesPlayed.count,
            gamesWon: gamesWon.count,
            gamesLost: gamesLost.count,
            winPercentage: gamesPlayed.count > 0 ? ((gamesWon.count / gamesPlayed.count) * 100).toFixed(1) : 0,
            bidsTotal: bidsTotal.count,
            bidsWon: bidsWon.count,
            bidSuccessRate: bidsTotal.count > 0 ? ((bidsWon.count / bidsTotal.count) * 100).toFixed(1) : 0,
            suitPreferences: suitStats,
            cocktailsServed: cocktailsServed.count,
            partnershipStats: partnershipStats.filter(p => p.partner_id !== null)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
