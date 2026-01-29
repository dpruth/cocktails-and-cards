const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join('/var/data', 'cocktails.db');
const schemaPath = path.join(__dirname, 'schema.sql');

// Ensure data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Run migrations for existing database (must run BEFORE schema)
function runMigrations() {
    // Check if players table exists and needs email column
    const playersTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='players'").get();

    if (playersTable) {
        const tableInfo = db.prepare("PRAGMA table_info(players)").all();
        const hasEmailColumn = tableInfo.some(col => col.name === 'email');

        if (!hasEmailColumn) {
            console.log('Migration: Adding email column to players table');
            // SQLite doesn't allow UNIQUE in ALTER TABLE, so add column first, then create unique index
            db.exec('ALTER TABLE players ADD COLUMN email TEXT');
            db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_players_email_unique ON players(email)');
        }
    }

    // Create magic_link_tokens table if it doesn't exist
    const tokensTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='magic_link_tokens'").get();
    if (!tokensTable) {
        console.log('Migration: Creating magic_link_tokens table');
        db.exec(`
            CREATE TABLE IF NOT EXISTS magic_link_tokens (
                id INTEGER PRIMARY KEY,
                email TEXT NOT NULL,
                token TEXT NOT NULL UNIQUE,
                player_id INTEGER REFERENCES players(id),
                expires_at DATETIME NOT NULL,
                used_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_magic_link_tokens_token ON magic_link_tokens(token);
            CREATE INDEX IF NOT EXISTS idx_magic_link_tokens_email ON magic_link_tokens(email);
        `);
    }

    // Create players email index if it doesn't exist
    const emailIndex = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_players_email'").get();
    if (!emailIndex) {
        try {
            db.exec('CREATE INDEX IF NOT EXISTS idx_players_email ON players(email)');
        } catch (e) {
            // Index might already exist
        }
    }
}

// Initialize database with schema
function initializeDatabase() {
    // Run migrations FIRST to update existing database
    runMigrations();

    // Then run schema (will skip existing tables but create missing ones)
    const schema = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schema);

    console.log('Database initialized successfully');
}

// 500 Scoring Logic
const SCORING = {
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
};

function calculateBidPoints(tricks, suit) {
    if (suit === 'misere') return SCORING.misere;
    if (suit === 'open_misere') return SCORING.openMisere;

    const suitIndex = SCORING.suits.indexOf(suit);
    if (suitIndex === -1 || tricks < 6 || tricks > 10) return 0;

    return SCORING.points[tricks][suitIndex];
}

// Helper function to get bid display name
function getBidDisplayName(tricks, suit) {
    if (suit === 'misere') return 'Misère';
    if (suit === 'open_misere') return 'Open Misère';

    const suitNames = {
        'spades': '♠',
        'clubs': '♣',
        'diamonds': '♦',
        'hearts': '♥',
        'no_trumps': 'NT'
    };

    return `${tricks}${suitNames[suit] || suit}`;
}

module.exports = {
    db,
    initializeDatabase,
    calculateBidPoints,
    getBidDisplayName,
    SCORING
};
