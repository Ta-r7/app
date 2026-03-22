const express = require('express');
const router = express.Router();
const { getOffers, fetchStores } = require('../services/dirkApiService');
const db = require('../db/sqlite');

// GET /api/dirk/offers
router.get('/offers', async (req, res) => {
  try {
    const storeId = req.query.storeId || db.prepare('SELECT value FROM settings WHERE key = ?').get('store_id')?.value || '';
    const offers = await getOffers(storeId);
    res.json({ offers, count: offers.length });
  } catch (error) {
    console.error('Error fetching offers:', error);
    res.status(500).json({ error: 'Failed to fetch offers' });
  }
});

// GET /api/dirk/stores
router.get('/stores', async (req, res) => {
  try {
    const stores = await fetchStores();
    res.json(stores);
  } catch (error) {
    console.error('Error fetching stores:', error);
    res.status(500).json({ error: 'Failed to fetch stores. API keys may not be configured.' });
  }
});

// GET /api/dirk/products
router.get('/products', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json({ products: [] });

    const products = db.prepare(`
      SELECT * FROM offers WHERE title LIKE ? OR brand_name LIKE ?
    `).all(`%${q}%`, `%${q}%`);

    res.json({ products });
  } catch (error) {
    console.error('Error searching products:', error);
    res.status(500).json({ error: 'Failed to search products' });
  }
});

module.exports = router;
