const express = require('express');
const router = express.Router();
const db = require('../db/sqlite');

// GET /api/standard-products
router.get('/', (req, res) => {
  try {
    const products = db.prepare('SELECT * FROM standard_products ORDER BY frequency, category, name').all();
    res.json({ products });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get standard products' });
  }
});

// POST /api/standard-products
router.post('/', (req, res) => {
  try {
    const { name, quantity, estimated_price, category, frequency } = req.body;
    if (!name || !quantity || estimated_price === undefined) {
      return res.status(400).json({ error: 'name, quantity, and estimated_price are required' });
    }
    const result = db.prepare(
      'INSERT INTO standard_products (name, quantity, estimated_price, category, frequency) VALUES (?, ?, ?, ?, ?)'
    ).run(name, quantity, parseFloat(estimated_price), category || '', frequency || 'weekly');
    res.json({ id: result.lastInsertRowid, success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add product' });
  }
});

// PUT /api/standard-products/:id
router.put('/:id', (req, res) => {
  try {
    const { name, quantity, estimated_price, category, frequency, active } = req.body;
    db.prepare(`
      UPDATE standard_products SET name = ?, quantity = ?, estimated_price = ?, category = ?, frequency = ?, active = ?
      WHERE id = ?
    `).run(name, quantity, parseFloat(estimated_price), category || '', frequency || 'weekly', active !== undefined ? (active ? 1 : 0) : 1, req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// DELETE /api/standard-products/:id
router.delete('/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM standard_products WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

module.exports = router;
