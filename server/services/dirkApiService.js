const db = require('../db/sqlite');
const cheerio = require('cheerio');

const DIRK_API_BASE = 'https://app-api.dirk.nl/v2';

function getHeaders() {
  return {
    'x-api-id': process.env.DIRK_API_ID || '',
    'x-api-key': process.env.DIRK_API_KEY || '',
    'User-Agent': 'okhttp/4.9.1',
    'Accept': 'application/json'
  };
}

function getCurrentWeekDates() {
  const now = new Date();
  // Dirk folder starts Wednesday
  const day = now.getDay();
  const diffToWed = day >= 3 ? day - 3 : day + 4;
  const startDate = new Date(now);
  startDate.setDate(now.getDate() - diffToWed);
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0]
  };
}

// Check if we have fresh cached offers (less than 12 hours old)
function getCachedOffers() {
  const { startDate, endDate } = getCurrentWeekDates();
  const offers = db.prepare(`
    SELECT * FROM offers
    WHERE valid_from <= ? AND valid_until >= ?
    AND fetched_at > datetime('now', '-12 hours')
  `).all(endDate, startDate);
  return offers.length > 0 ? offers : null;
}

// Fetch offers from Dirk API
async function fetchOffersFromApi(storeId) {
  const { startDate, endDate } = getCurrentWeekDates();
  const url = `${DIRK_API_BASE}/catalog/offers?storeId=${storeId}&startDate=${startDate}&endDate=${endDate}`;

  const response = await fetch(url, { headers: getHeaders() });
  if (!response.ok) {
    throw new Error(`Dirk API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data;
}

// Fetch stores
async function fetchStores() {
  const url = `${DIRK_API_BASE}/stores?formulaId=2`;
  const response = await fetch(url, { headers: getHeaders() });
  if (!response.ok) {
    throw new Error(`Dirk API stores error: ${response.status}`);
  }
  return response.json();
}

// Fallback: scrape offers from dirk.nl
async function scrapeOffers() {
  try {
    const response = await fetch('https://www.dirk.nl/aanbiedingen', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'nl-NL,nl;q=0.9'
      }
    });

    if (!response.ok) {
      throw new Error(`Scrape failed: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const offers = [];

    // Try multiple selectors for offer cards
    const selectors = [
      '[data-testid="offer-card"]',
      '.offer-card',
      '.product-card',
      '.promotion-card',
      'article[class*="offer"]',
      'article[class*="product"]',
      '[class*="OfferCard"]',
      '[class*="offer-item"]'
    ];

    let $cards = $([]);
    for (const sel of selectors) {
      $cards = $(sel);
      if ($cards.length > 0) break;
    }

    // If specific selectors fail, try to find JSON-LD or embedded data
    if ($cards.length === 0) {
      // Try to find embedded JSON data in script tags
      $('script').each((_, el) => {
        const text = $(el).html() || '';
        if (text.includes('offers') || text.includes('products') || text.includes('aanbiedingen')) {
          try {
            // Look for JSON data patterns
            const jsonMatch = text.match(/(?:window\.__(?:NEXT_DATA|NUXT)__|__INITIAL_STATE__)\s*=\s*({[\s\S]*?});?\s*(?:<\/script>|$)/);
            if (jsonMatch) {
              const data = JSON.parse(jsonMatch[1]);
              // Try to extract offers from embedded data
              const extractOffers = (obj, depth = 0) => {
                if (depth > 5) return;
                if (Array.isArray(obj)) {
                  obj.forEach(item => {
                    if (item && typeof item === 'object' && (item.title || item.name) && (item.price || item.discountPrice || item.salePrice)) {
                      offers.push({
                        id: item.id || item.offerId || `scraped-${offers.length}`,
                        title: item.title || item.name || '',
                        descriptive_size: item.descriptiveSize || item.size || '',
                        original_price: parseFloat(item.originalPrice || item.price || 0),
                        discount_price: parseFloat(item.discountPrice || item.salePrice || item.price || 0),
                        price_label: item.priceLabel || '',
                        category: item.category || '',
                        brand_name: item.brandName || item.brand || '',
                        image_url: item.imageUrl || item.image || ''
                      });
                    }
                  });
                }
                if (obj && typeof obj === 'object') {
                  Object.values(obj).forEach(v => extractOffers(v, depth + 1));
                }
              };
              extractOffers(data);
            }
          } catch (e) { /* ignore parse errors */ }
        }
      });
    }

    // Parse cards if found
    $cards.each((_, el) => {
      const $el = $(el);
      const title = $el.find('[class*="title"], h3, h4, .name').first().text().trim();
      const priceText = $el.find('[class*="price"], .price').text().trim();
      const sizeText = $el.find('[class*="size"], .size, .weight').text().trim();
      const imgSrc = $el.find('img').attr('src') || '';

      if (title) {
        const priceMatch = priceText.match(/(\d+[.,]\d{2})/g);
        offers.push({
          id: `scraped-${offers.length}`,
          title,
          descriptive_size: sizeText,
          original_price: priceMatch && priceMatch.length > 1 ? parseFloat(priceMatch[0].replace(',', '.')) : 0,
          discount_price: priceMatch ? parseFloat(priceMatch[priceMatch.length - 1].replace(',', '.')) : 0,
          price_label: priceText,
          category: '',
          brand_name: '',
          image_url: imgSrc
        });
      }
    });

    // If still no offers, generate sample data for development
    if (offers.length === 0) {
      return getSampleOffers();
    }

    return offers;
  } catch (error) {
    console.error('Scraping failed:', error.message);
    return getSampleOffers();
  }
}

// Sample offers for development/fallback
function getSampleOffers() {
  const { startDate, endDate } = getCurrentWeekDates();
  return [
    { id: 'sample-1', title: 'Kipfilet', descriptive_size: '450g', original_price: 5.99, discount_price: 3.99, price_label: '3.99', valid_from: startDate, valid_until: endDate, category: 'Vlees', brand_name: 'Dirk', image_url: '' },
    { id: 'sample-2', title: 'Rundergehakt', descriptive_size: '500g', original_price: 4.99, discount_price: 3.49, price_label: '3.49', valid_from: startDate, valid_until: endDate, category: 'Vlees', brand_name: 'Dirk', image_url: '' },
    { id: 'sample-3', title: 'Magere kwark', descriptive_size: '500g', original_price: 1.29, discount_price: 0.89, price_label: '0.89', valid_from: startDate, valid_until: endDate, category: 'Zuivel', brand_name: 'Zuivelhoeve', image_url: '' },
    { id: 'sample-4', title: 'Eieren', descriptive_size: '10 stuks', original_price: 2.79, discount_price: 1.99, price_label: '1.99', valid_from: startDate, valid_until: endDate, category: 'Zuivel', brand_name: 'Dirk', image_url: '' },
    { id: 'sample-5', title: 'Tonijn in water', descriptive_size: '3x80g', original_price: 3.49, discount_price: 2.49, price_label: '2.49', valid_from: startDate, valid_until: endDate, category: 'Conserven', brand_name: 'John West', image_url: '' },
    { id: 'sample-6', title: 'Cottage cheese', descriptive_size: '200g', original_price: 1.89, discount_price: 1.29, price_label: '1.29', valid_from: startDate, valid_until: endDate, category: 'Zuivel', brand_name: 'Almhof', image_url: '' },
    { id: 'sample-7', title: 'Volkoren brood', descriptive_size: 'heel', original_price: 1.89, discount_price: 1.49, price_label: '1.49', valid_from: startDate, valid_until: endDate, category: 'Brood', brand_name: 'Dirk', image_url: '' },
    { id: 'sample-8', title: 'Rode linzen', descriptive_size: '500g', original_price: 2.29, discount_price: 1.59, price_label: '1.59', valid_from: startDate, valid_until: endDate, category: 'Droogwaren', brand_name: 'Lassie', image_url: '' },
    { id: 'sample-9', title: 'Kippenpoten', descriptive_size: '1kg', original_price: 4.49, discount_price: 2.99, price_label: '2.99', valid_from: startDate, valid_until: endDate, category: 'Vlees', brand_name: 'Dirk', image_url: '' },
    { id: 'sample-10', title: 'Griekse yoghurt', descriptive_size: '500g', original_price: 2.19, discount_price: 1.49, price_label: '1.49', valid_from: startDate, valid_until: endDate, category: 'Zuivel', brand_name: 'FAGE', image_url: '' },
    { id: 'sample-11', title: 'Pindakaas naturel', descriptive_size: '350g', original_price: 2.99, discount_price: 1.99, price_label: '1.99', valid_from: startDate, valid_until: endDate, category: 'Broodbeleg', brand_name: 'Calvé', image_url: '' },
    { id: 'sample-12', title: 'Rijst', descriptive_size: '1kg', original_price: 2.49, discount_price: 1.79, price_label: '1.79', valid_from: startDate, valid_until: endDate, category: 'Droogwaren', brand_name: 'Lassie', image_url: '' },
    { id: 'sample-13', title: 'Sperziebonen', descriptive_size: '400g', original_price: 1.99, discount_price: 1.29, price_label: '1.29', valid_from: startDate, valid_until: endDate, category: 'Groente', brand_name: 'Dirk', image_url: '' },
    { id: 'sample-14', title: 'Havermout', descriptive_size: '500g', original_price: 1.49, discount_price: 0.99, price_label: '0.99', valid_from: startDate, valid_until: endDate, category: 'Ontbijt', brand_name: 'Quaker', image_url: '' },
    { id: 'sample-15', title: 'Bananen', descriptive_size: 'tros 5 stuks', original_price: 1.79, discount_price: 1.29, price_label: '1.29', valid_from: startDate, valid_until: endDate, category: 'Fruit', brand_name: '', image_url: '' },
    { id: 'sample-16', title: 'Pasta penne', descriptive_size: '500g', original_price: 1.39, discount_price: 0.89, price_label: '0.89', valid_from: startDate, valid_until: endDate, category: 'Droogwaren', brand_name: 'Grand Italia', image_url: '' },
    { id: 'sample-17', title: 'Kipworst', descriptive_size: '275g', original_price: 2.49, discount_price: 1.69, price_label: '1.69', valid_from: startDate, valid_until: endDate, category: 'Vlees', brand_name: 'Unox', image_url: '' },
    { id: 'sample-18', title: 'Jonge kaas', descriptive_size: '500g stuk', original_price: 4.99, discount_price: 3.49, price_label: '3.49', valid_from: startDate, valid_until: endDate, category: 'Kaas', brand_name: 'Dirk', image_url: '' },
    { id: 'sample-19', title: 'Koffiebonen', descriptive_size: '500g', original_price: 6.99, discount_price: 4.99, price_label: '4.99', valid_from: startDate, valid_until: endDate, category: 'Dranken', brand_name: 'Douwe Egberts', image_url: '' },
    { id: 'sample-20', title: 'Broccoli', descriptive_size: 'per stuk', original_price: 1.49, discount_price: 0.99, price_label: '0.99', valid_from: startDate, valid_until: endDate, category: 'Groente', brand_name: '', image_url: '' }
  ];
}

// Cache offers to SQLite
function cacheOffers(offers) {
  const { startDate, endDate } = getCurrentWeekDates();
  const insert = db.prepare(`
    INSERT OR REPLACE INTO offers (id, title, descriptive_size, original_price, discount_price, price_label, valid_from, valid_until, category, brand_name, image_url, raw_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((items) => {
    for (const item of items) {
      insert.run(
        item.id || item.offerId || `offer-${Math.random().toString(36).slice(2)}`,
        item.title || item.name || '',
        item.descriptive_size || item.descriptiveSize || '',
        item.original_price || item.originalPrice || 0,
        item.discount_price || item.discountPrice || 0,
        item.price_label || item.priceLabel || '',
        item.valid_from || item.validFrom || startDate,
        item.valid_until || item.validUntil || endDate,
        item.category || '',
        item.brand_name || item.brandName || '',
        item.image_url || item.imageUrl || '',
        JSON.stringify(item)
      );
    }
  });

  insertMany(offers);
}

// Main function to get offers (API → scraper fallback → sample data)
async function getOffers(storeId) {
  // Check cache first
  const cached = getCachedOffers();
  if (cached) {
    return cached;
  }

  let offers = [];

  // Try API first if credentials are configured
  if (process.env.DIRK_API_ID && process.env.DIRK_API_KEY && storeId) {
    try {
      const apiData = await fetchOffersFromApi(storeId);
      offers = Array.isArray(apiData) ? apiData : (apiData.offers || apiData.data || []);
    } catch (error) {
      console.warn('Dirk API failed, falling back to scraper:', error.message);
    }
  }

  // Fallback to scraper
  if (offers.length === 0) {
    offers = await scrapeOffers();
  }

  // Cache the results
  if (offers.length > 0) {
    cacheOffers(offers);
  }

  return offers;
}

module.exports = { getOffers, fetchStores, getCurrentWeekDates, getSampleOffers };
