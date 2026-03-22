const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '..', '..', 'dirk.db'));

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS offers (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    descriptive_size TEXT,
    original_price REAL,
    discount_price REAL,
    price_label TEXT,
    valid_from TEXT,
    valid_until TEXT,
    category TEXT,
    brand_name TEXT,
    image_url TEXT,
    raw_json TEXT,
    fetched_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    brand_name TEXT,
    descriptive_size TEXT,
    sale_price REAL,
    category TEXT,
    raw_json TEXT,
    fetched_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS meal_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    week_start TEXT NOT NULL,
    week_end TEXT NOT NULL,
    plan_json TEXT NOT NULL,
    total_cost REAL,
    total_savings REAL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS shopping_lists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    meal_plan_id INTEGER REFERENCES meal_plans(id),
    items_json TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS checked_items (
    shopping_list_id INTEGER,
    item_index INTEGER,
    checked INTEGER DEFAULT 0,
    PRIMARY KEY (shopping_list_id, item_index)
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS standard_products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    quantity TEXT NOT NULL,
    estimated_price REAL NOT NULL,
    category TEXT DEFAULT '',
    frequency TEXT DEFAULT 'weekly',
    active INTEGER DEFAULT 1
  );
`);

// Default settings
const defaultSettings = {
  store_id: '',
  budget: '30',
  protein_min: '160',
  protein_max: '180',
  kcal_min: '3300',
  kcal_max: '3500',
  biweekly_this_week: 'true'
};

const upsertSetting = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
const getSetting = db.prepare('SELECT value FROM settings WHERE key = ?');

for (const [key, value] of Object.entries(defaultSettings)) {
  const existing = getSetting.get(key);
  if (!existing) {
    upsertSetting.run(key, value);
  }
}

// Seed default standard products if empty
const productCount = db.prepare('SELECT COUNT(*) as count FROM standard_products').get().count;
if (productCount === 0) {
  const insertProduct = db.prepare('INSERT INTO standard_products (name, quantity, estimated_price, category, frequency) VALUES (?, ?, ?, ?, ?)');
  const defaults = [
    ['Volkoren brood', '3 stuks', 4.50, 'Brood', 'weekly'],
    ['Havermout', '500g', 1.50, 'Bananenbrood', 'weekly'],
    ['Bananen', '6 stuks', 1.80, 'Bananenbrood', 'weekly'],
    ['Eieren', '6 stuks', 2.00, 'Bananenbrood', 'weekly'],
    ['Dadels', '12 stuks (~180g)', 3.00, 'Bananenbrood', 'weekly'],
    ['Melk', '360ml', 0.50, 'Bananenbrood', 'weekly'],
    ['Pure chocolade 90%', '6 blokjes (~100g)', 2.00, 'Bananenbrood', 'weekly'],
    ['Jonge kaas', '1 blok (~500g)', 4.00, 'Kaas', 'biweekly'],
    ['Koffiebonen', '500g', 5.00, 'Dranken', 'biweekly']
  ];
  const insertAll = db.transaction(() => {
    defaults.forEach(d => insertProduct.run(...d));
  });
  insertAll();
}

module.exports = db;
