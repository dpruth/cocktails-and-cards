const express = require('express');
const path = require('path');
const { initializeDatabase } = require('./database/db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize database
initializeDatabase();

// API Routes
app.use('/api/players', require('./routes/players'));
app.use('/api/cocktails', require('./routes/cocktails'));
app.use('/api/games', require('./routes/games'));
app.use('/api/sessions', require('./routes/sessions'));

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
