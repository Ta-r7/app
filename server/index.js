require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/dirk', require('./routes/dirk'));
app.use('/api/mealplan', require('./routes/mealplan'));
app.use('/api/shopping-list', require('./routes/shoppingList'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/standard-products', require('./routes/standardProducts'));

// Budget info endpoint
const { calculateBudget } = require('./services/budgetCalculator');
const { getOffers } = require('./services/dirkApiService');
const db = require('./db/sqlite');

app.get('/api/budget', async (req, res) => {
  try {
    const settings = {};
    db.prepare('SELECT key, value FROM settings').all().forEach(r => { settings[r.key] = r.value; });
    const offers = await getOffers(settings.store_id || '');
    const budget = calculateBudget(offers, settings);
    res.json(budget);
  } catch (error) {
    res.status(500).json({ error: 'Failed to calculate budget' });
  }
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', 'client', 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Dirk Budget App server running on port ${PORT}`);
});
