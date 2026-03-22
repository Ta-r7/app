const express = require('express');
const router = express.Router();
const { generateMealPlan } = require('../services/claudeService');
const { getOffers, getCurrentWeekDates } = require('../services/dirkApiService');
const { calculateBudget } = require('../services/budgetCalculator');
const db = require('../db/sqlite');

function getSettings() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settings = {};
  rows.forEach(r => { settings[r.key] = r.value; });
  return settings;
}

// POST /api/mealplan/generate
router.post('/generate', async (req, res) => {
  try {
    const settings = getSettings();
    const storeId = settings.store_id || '';
    const offers = await getOffers(storeId);
    const budgetInfo = calculateBudget(offers, settings);

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(400).json({ error: 'ANTHROPIC_API_KEY is not configured in .env' });
    }

    const plan = await generateMealPlan(offers, budgetInfo, settings);
    const { startDate, endDate } = getCurrentWeekDates();

    // Save to database
    const result = db.prepare(`
      INSERT INTO meal_plans (week_start, week_end, plan_json, total_cost, total_savings)
      VALUES (?, ?, ?, ?, ?)
    `).run(startDate, endDate, JSON.stringify(plan), plan.totalCost || 0, plan.totalSavings || 0);

    // Save shopping list
    const allItems = [
      ...budgetInfo.weeklyItems.map(i => ({ ...i, isFixed: true })),
      ...budgetInfo.biweeklyItems.map(i => ({ ...i, isFixed: true, isBiweekly: true })),
      ...(plan.shoppingList || [])
    ];

    db.prepare(`
      INSERT INTO shopping_lists (meal_plan_id, items_json) VALUES (?, ?)
    `).run(result.lastInsertRowid, JSON.stringify(allItems));

    res.json({
      mealPlan: plan,
      budget: budgetInfo,
      id: result.lastInsertRowid
    });
  } catch (error) {
    console.error('Error generating meal plan:', error);
    res.status(500).json({ error: error.message || 'Failed to generate meal plan' });
  }
});

// GET /api/mealplan/current
router.get('/current', (req, res) => {
  try {
    const { startDate, endDate } = getCurrentWeekDates();
    const plan = db.prepare(`
      SELECT * FROM meal_plans
      WHERE week_start >= ? AND week_end <= ?
      ORDER BY created_at DESC LIMIT 1
    `).get(startDate, endDate);

    if (!plan) {
      return res.json({ mealPlan: null });
    }

    const settings = getSettings();
    const offers = db.prepare(`SELECT * FROM offers WHERE valid_from <= ? AND valid_until >= ?`).all(endDate, startDate);
    const budgetInfo = calculateBudget(offers, settings);

    res.json({
      mealPlan: JSON.parse(plan.plan_json),
      budget: budgetInfo,
      id: plan.id,
      createdAt: plan.created_at
    });
  } catch (error) {
    console.error('Error getting current meal plan:', error);
    res.status(500).json({ error: 'Failed to get current meal plan' });
  }
});

// GET /api/mealplan/history
router.get('/history', (req, res) => {
  try {
    const plans = db.prepare(`
      SELECT id, week_start, week_end, total_cost, total_savings, created_at
      FROM meal_plans ORDER BY created_at DESC LIMIT 12
    `).all();
    res.json({ plans });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get history' });
  }
});

module.exports = router;
