const express = require('express');
const router = express.Router();
const db = require('../db/sqlite');
const { getCurrentWeekDates } = require('../services/dirkApiService');
const { calculateBudget } = require('../services/budgetCalculator');

// GET /api/shopping-list/current
router.get('/current', (req, res) => {
  try {
    const { startDate, endDate } = getCurrentWeekDates();
    const plan = db.prepare(`
      SELECT mp.id as plan_id, sl.id as list_id, sl.items_json
      FROM meal_plans mp
      JOIN shopping_lists sl ON sl.meal_plan_id = mp.id
      WHERE mp.week_start >= ? AND mp.week_end <= ?
      ORDER BY mp.created_at DESC LIMIT 1
    `).get(startDate, endDate);

    if (!plan) {
      // Return just fixed items if no meal plan
      const settings = {};
      db.prepare('SELECT key, value FROM settings').all().forEach(r => { settings[r.key] = r.value; });
      const budgetInfo = calculateBudget([], settings);
      const fixedItems = [
        ...budgetInfo.weeklyItems.map(i => ({ ...i, isFixed: true })),
        ...budgetInfo.biweeklyItems.map(i => ({ ...i, isFixed: true, isBiweekly: true }))
      ];
      return res.json({ items: fixedItems, checkedItems: [], listId: null });
    }

    const items = JSON.parse(plan.items_json);
    const checkedRows = db.prepare('SELECT item_index, checked FROM checked_items WHERE shopping_list_id = ?').all(plan.list_id);
    const checkedItems = checkedRows.filter(r => r.checked).map(r => r.item_index);

    res.json({ items, checkedItems, listId: plan.list_id });
  } catch (error) {
    console.error('Error getting shopping list:', error);
    res.status(500).json({ error: 'Failed to get shopping list' });
  }
});

// PUT /api/shopping-list/check/:itemIndex
router.put('/check/:itemIndex', (req, res) => {
  try {
    const { listId, checked } = req.body;
    const itemIndex = parseInt(req.params.itemIndex);

    if (!listId) return res.status(400).json({ error: 'listId required' });

    db.prepare(`
      INSERT OR REPLACE INTO checked_items (shopping_list_id, item_index, checked) VALUES (?, ?, ?)
    `).run(listId, itemIndex, checked ? 1 : 0);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update item' });
  }
});

module.exports = router;
