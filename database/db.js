const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '..', 'data', 'cocktails.db');
const schemaPath = path.join(__dirname, 'schema.sql');

// Ensure data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize database with schema
function initializeDatabase() {
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
