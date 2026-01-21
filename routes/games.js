const express = require('express');
const router = express.Router();
const { db, calculateBidPoints, getBidDisplayName } = require('../database/db');

// Get all games
router.get('/', (req, res) => {
    try {
        const { completed } = req.query;
        let sql = `
            SELECT g.*,
                p1.name as team1_player1_name, p1.avatar_color as team1_player1_color,
                p2.name as team1_player2_name, p2.avatar_color as team1_player2_color,
                p3.name as team2_player1_name, p3.avatar_color as team2_player1_color,
                p4.name as team2_player2_name, p4.avatar_color as team2_player2_color
            FROM games g
            LEFT JOIN players p1 ON g.team1_player1 = p1.id
            LEFT JOIN players p2 ON g.team1_player2 = p2.id
            LEFT JOIN players p3 ON g.team2_player1 = p3.id
            LEFT JOIN players p4 ON g.team2_player2 = p4.id
        `;

        if (completed !== undefined) {
            sql += ` WHERE g.completed = ${completed === 'true' ? 1 : 0}`;
        }

        sql += ' ORDER BY g.played_date DESC, g.created_at DESC';

        const games = db.prepare(sql).all();
        res.json(games);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get single game with hands
router.get('/:id', (req, res) => {
    try {
        const game = db.prepare(`
            SELECT g.*,
                p1.name as team1_player1_name, p1.avatar_color as team1_player1_color,
                p2.name as team1_player2_name, p2.avatar_color as team1_player2_color,
                p3.name as team2_player1_name, p3.avatar_color as team2_player1_color,
                p4.name as team2_player2_name, p4.avatar_color as team2_player2_color
            FROM games g
            LEFT JOIN players p1 ON g.team1_player1 = p1.id
            LEFT JOIN players p2 ON g.team1_player2 = p2.id
            LEFT JOIN players p3 ON g.team2_player1 = p3.id
            LEFT JOIN players p4 ON g.team2_player2 = p4.id
            WHERE g.id = ?
        `).get(req.params.id);

        if (!game) {
            return res.status(404).json({ error: 'Game not found' });
        }

        const hands = db.prepare(`
            SELECT h.*, p.name as bidder_name, p.avatar_color as bidder_color
            FROM hands h
            LEFT JOIN players p ON h.bidder_id = p.id
            WHERE h.game_id = ?
            ORDER BY h.hand_number
        `).all(req.params.id);

        // Add display name for each hand
        hands.forEach(hand => {
            hand.bid_display = getBidDisplayName(hand.bid_tricks, hand.bid_suit);
        });

        game.hands = hands;
        res.json(game);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create new game
router.post('/', (req, res) => {
    try {
        const { played_date, team1_player1, team1_player2, team2_player1, team2_player2 } = req.body;

        if (!played_date || !team1_player1 || !team1_player2 || !team2_player1 || !team2_player2) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Validate all players are different
        const players = [team1_player1, team1_player2, team2_player1, team2_player2];
        if (new Set(players).size !== 4) {
            return res.status(400).json({ error: 'All players must be different' });
        }

        const stmt = db.prepare(`
            INSERT INTO games (played_date, team1_player1, team1_player2, team2_player1, team2_player2)
            VALUES (?, ?, ?, ?, ?)
        `);

        const result = stmt.run(played_date, team1_player1, team1_player2, team2_player1, team2_player2);

        const game = db.prepare('SELECT * FROM games WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json(game);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add hand to game
router.post('/:id/hands', (req, res) => {
    try {
        const gameId = req.params.id;
        const { bidder_id, bid_tricks, bid_suit, bid_won, opponent_tricks } = req.body;

        // Get game
        const game = db.prepare('SELECT * FROM games WHERE id = ?').get(gameId);
        if (!game) {
            return res.status(404).json({ error: 'Game not found' });
        }

        if (game.completed) {
            return res.status(400).json({ error: 'Game is already completed' });
        }

        // Calculate points
        const bidPoints = calculateBidPoints(bid_tricks, bid_suit);

        // Determine which team bid
        const team1Players = [game.team1_player1, game.team1_player2];
        const team2Players = [game.team2_player1, game.team2_player2];
        const bidderTeam = team1Players.includes(bidder_id) ? 1 : 2;

        let team1HandScore = 0;
        let team2HandScore = 0;

        if (bid_won) {
            if (bidderTeam === 1) {
                team1HandScore = bidPoints;
                team2HandScore = (opponent_tricks || 0) * 10;
            } else {
                team2HandScore = bidPoints;
                team1HandScore = (opponent_tricks || 0) * 10;
            }
        } else {
            if (bidderTeam === 1) {
                team1HandScore = -bidPoints;
                team2HandScore = (opponent_tricks || 0) * 10;
            } else {
                team2HandScore = -bidPoints;
                team1HandScore = (opponent_tricks || 0) * 10;
            }
        }

        // Get next hand number
        const lastHand = db.prepare('SELECT MAX(hand_number) as max FROM hands WHERE game_id = ?').get(gameId);
        const handNumber = (lastHand.max || 0) + 1;

        // Insert hand
        const stmt = db.prepare(`
            INSERT INTO hands (game_id, hand_number, bidder_id, bid_tricks, bid_suit, bid_won, points_won, team1_hand_score, team2_hand_score)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run(gameId, handNumber, bidder_id, bid_tricks, bid_suit, bid_won ? 1 : 0, bidPoints, team1HandScore, team2HandScore);

        // Update game scores
        const newTeam1Score = game.team1_score + team1HandScore;
        const newTeam2Score = game.team2_score + team2HandScore;

        db.prepare('UPDATE games SET team1_score = ?, team2_score = ? WHERE id = ?')
            .run(newTeam1Score, newTeam2Score, gameId);

        // Return updated game
        const updatedGame = db.prepare('SELECT * FROM games WHERE id = ?').get(gameId);
        const hands = db.prepare('SELECT * FROM hands WHERE game_id = ? ORDER BY hand_number').all(gameId);
        updatedGame.hands = hands;

        res.status(201).json(updatedGame);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Complete game
router.post('/:id/complete', (req, res) => {
    try {
        const gameId = req.params.id;
        const game = db.prepare('SELECT * FROM games WHERE id = ?').get(gameId);

        if (!game) {
            return res.status(404).json({ error: 'Game not found' });
        }

        // Determine winner (team with score >= 500 or highest score)
        let winnerTeam = null;
        if (game.team1_score >= 500 || game.team2_score <= -500) {
            winnerTeam = 1;
        } else if (game.team2_score >= 500 || game.team1_score <= -500) {
            winnerTeam = 2;
        } else {
            winnerTeam = game.team1_score > game.team2_score ? 1 : 2;
        }

        db.prepare('UPDATE games SET completed = 1, winner_team = ? WHERE id = ?')
            .run(winnerTeam, gameId);

        const updatedGame = db.prepare('SELECT * FROM games WHERE id = ?').get(gameId);
        res.json(updatedGame);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete game
router.delete('/:id', (req, res) => {
    try {
        const result = db.prepare('DELETE FROM games WHERE id = ?').run(req.params.id);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Game not found' });
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete hand from game
router.delete('/:gameId/hands/:handId', (req, res) => {
    try {
        const { gameId, handId } = req.params;

        // Get the hand
        const hand = db.prepare('SELECT * FROM hands WHERE id = ? AND game_id = ?').get(handId, gameId);
        if (!hand) {
            return res.status(404).json({ error: 'Hand not found' });
        }

        // Get the game
        const game = db.prepare('SELECT * FROM games WHERE id = ?').get(gameId);
        if (game.completed) {
            return res.status(400).json({ error: 'Cannot modify completed game' });
        }

        // Update game scores
        const newTeam1Score = game.team1_score - hand.team1_hand_score;
        const newTeam2Score = game.team2_score - hand.team2_hand_score;

        db.prepare('UPDATE games SET team1_score = ?, team2_score = ? WHERE id = ?')
            .run(newTeam1Score, newTeam2Score, gameId);

        // Delete hand
        db.prepare('DELETE FROM hands WHERE id = ?').run(handId);

        // Return updated game
        const updatedGame = db.prepare('SELECT * FROM games WHERE id = ?').get(gameId);
        res.json(updatedGame);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get recent games (for dashboard)
router.get('/recent/list', (req, res) => {
    try {
        const limit = req.query.limit || 5;
        const games = db.prepare(`
            SELECT g.*,
                p1.name as team1_player1_name,
                p2.name as team1_player2_name,
                p3.name as team2_player1_name,
                p4.name as team2_player2_name
            FROM games g
            LEFT JOIN players p1 ON g.team1_player1 = p1.id
            LEFT JOIN players p2 ON g.team1_player2 = p2.id
            LEFT JOIN players p3 ON g.team2_player1 = p3.id
            LEFT JOIN players p4 ON g.team2_player2 = p4.id
            WHERE g.completed = 1
            ORDER BY g.played_date DESC, g.created_at DESC
            LIMIT ?
        `).all(limit);

        res.json(games);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get leaderboard
router.get('/stats/leaderboard', (req, res) => {
    try {
        const players = db.prepare('SELECT * FROM players').all();

        const leaderboard = players.map(player => {
            const gamesWon = db.prepare(`
                SELECT COUNT(*) as count FROM games
                WHERE completed = 1 AND (
                    (winner_team = 1 AND (team1_player1 = ? OR team1_player2 = ?)) OR
                    (winner_team = 2 AND (team2_player1 = ? OR team2_player2 = ?))
                )
            `).get(player.id, player.id, player.id, player.id);

            const gamesPlayed = db.prepare(`
                SELECT COUNT(*) as count FROM games
                WHERE completed = 1 AND (
                    team1_player1 = ? OR team1_player2 = ? OR
                    team2_player1 = ? OR team2_player2 = ?
                )
            `).get(player.id, player.id, player.id, player.id);

            return {
                ...player,
                gamesPlayed: gamesPlayed.count,
                gamesWon: gamesWon.count,
                winPercentage: gamesPlayed.count > 0 ? ((gamesWon.count / gamesPlayed.count) * 100).toFixed(1) : 0
            };
        });

        // Sort by win percentage (with games played as tiebreaker)
        leaderboard.sort((a, b) => {
            if (parseFloat(b.winPercentage) !== parseFloat(a.winPercentage)) {
                return parseFloat(b.winPercentage) - parseFloat(a.winPercentage);
            }
            return b.gamesPlayed - a.gamesPlayed;
        });

        res.json(leaderboard);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
