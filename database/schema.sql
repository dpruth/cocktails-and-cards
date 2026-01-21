-- Cocktails and Cards Database Schema

-- Players Table
CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    avatar_color TEXT DEFAULT '#3498db'
);

-- Pre-seed with 6 players
INSERT OR IGNORE INTO players (id, name, avatar_color) VALUES
    (1, 'Player 1', '#e74c3c'),
    (2, 'Player 2', '#3498db'),
    (3, 'Player 3', '#2ecc71'),
    (4, 'Player 4', '#f39c12'),
    (5, 'Player 5', '#9b59b6'),
    (6, 'Player 6', '#1abc9c');

-- Cocktails Table
CREATE TABLE IF NOT EXISTS cocktails (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    ingredients TEXT NOT NULL,
    instructions TEXT,
    served_by INTEGER REFERENCES players(id),
    served_date DATE NOT NULL,
    image_url TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Games Table (500 Card Game)
CREATE TABLE IF NOT EXISTS games (
    id INTEGER PRIMARY KEY,
    played_date DATE NOT NULL,
    team1_player1 INTEGER REFERENCES players(id),
    team1_player2 INTEGER REFERENCES players(id),
    team2_player1 INTEGER REFERENCES players(id),
    team2_player2 INTEGER REFERENCES players(id),
    team1_score INTEGER DEFAULT 0,
    team2_score INTEGER DEFAULT 0,
    winner_team INTEGER,
    completed BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Hands Table (Individual hands within a game)
CREATE TABLE IF NOT EXISTS hands (
    id INTEGER PRIMARY KEY,
    game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
    hand_number INTEGER NOT NULL,
    bidder_id INTEGER REFERENCES players(id),
    bid_tricks INTEGER,
    bid_suit TEXT,
    bid_won BOOLEAN,
    points_won INTEGER,
    team1_hand_score INTEGER DEFAULT 0,
    team2_hand_score INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cocktails_served_by ON cocktails(served_by);
CREATE INDEX IF NOT EXISTS idx_cocktails_served_date ON cocktails(served_date);
CREATE INDEX IF NOT EXISTS idx_games_played_date ON games(played_date);
CREATE INDEX IF NOT EXISTS idx_hands_game_id ON hands(game_id);
CREATE INDEX IF NOT EXISTS idx_hands_bidder_id ON hands(bidder_id);
