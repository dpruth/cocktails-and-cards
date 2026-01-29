require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const { initializeDatabase } = require('./database/db');
const { initializeEmailService } = require('./services/email');
const { requireAuth } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy (required for secure cookies behind Render/Heroku/etc)
app.set('trust proxy', 1);

// Middleware
app.use(express.json());

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        sameSite: 'lax'
    }
}));

// Static files (before auth so CSS/JS can load for login page)
app.use(express.static(path.join(__dirname, 'public')));

// Initialize database
initializeDatabase();

// Initialize email service
initializeEmailService();

// Auth routes (no authentication required)
app.use('/api/auth', require('./routes/auth'));

// Protected API Routes - require authentication
app.use('/api/players', requireAuth, require('./routes/players'));
app.use('/api/cocktails', requireAuth, require('./routes/cocktails'));
app.use('/api/games', requireAuth, require('./routes/games'));
app.use('/api/sessions', requireAuth, require('./routes/sessions'));

// Serve the SPA for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
    console.log(`Cocktails & Cards server running at http://localhost:${PORT}`);
});
