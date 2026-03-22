const db = require('../db/sqlite');

// Get standard products from database
function getStandardProducts() {
  return db.prepare('SELECT * FROM standard_products WHERE active = 1 ORDER BY frequency, category, name').all();
}

// Try to match standard items with current offers for real prices
function matchOffersToProducts(products, offers) {
  return products.map(product => {
    const keywords = product.name.toLowerCase().split(' ');
    const match = offers.find(offer => {
      const offerTitle = (offer.title || '').toLowerCase();
      return keywords.some(kw => kw.length > 3 && offerTitle.includes(kw));
    });

    if (match && (match.discount_price || match.discountPrice) > 0) {
      const discountPrice = match.discount_price || match.discountPrice;
      return {
        ...product,
        item: product.name,
        quantity: product.quantity,
        actualPrice: discountPrice,
        estimatedPrice: product.estimated_price,
        isOffer: true,
        savings: Math.max(0, product.estimated_price - discountPrice),
        offerId: match.id
      };
    }
    return {
      ...product,
      item: product.name,
      quantity: product.quantity,
      actualPrice: product.estimated_price,
      estimatedPrice: product.estimated_price,
      isOffer: false,
      savings: 0
    };
  });
}

function calculateBudget(offers = [], settings = {}) {
  const totalBudget = parseFloat(settings.budget || 30);
  const includeBiweekly = settings.biweekly_this_week !== 'false';

  const allProducts = getStandardProducts();

  const weeklyProducts = allProducts.filter(p => p.frequency === 'weekly');
  const biweeklyProducts = allProducts.filter(p => p.frequency === 'biweekly');

  // Match with offers
  const weeklyItems = matchOffersToProducts(weeklyProducts, offers);
  const biweeklyItems = includeBiweekly ? matchOffersToProducts(biweeklyProducts, offers) : [];

  const fixedCost = weeklyItems.reduce((sum, i) => sum + i.actualPrice, 0);
  const biweeklyCost = biweeklyItems.reduce((sum, i) => sum + i.actualPrice, 0);
  const totalFixedCost = fixedCost + biweeklyCost;
  const remainingBudget = totalBudget - totalFixedCost;

  const totalSavings = [...weeklyItems, ...biweeklyItems].reduce((sum, i) => sum + i.savings, 0);

  return {
    totalBudget,
    fixedCost: Math.round(fixedCost * 100) / 100,
    biweeklyCost: Math.round(biweeklyCost * 100) / 100,
    totalFixedCost: Math.round(totalFixedCost * 100) / 100,
    remainingBudget: Math.round(remainingBudget * 100) / 100,
    totalSavings: Math.round(totalSavings * 100) / 100,
    weeklyItems,
    biweeklyItems,
    includeBiweekly
  };
}

module.exports = { calculateBudget, getStandardProducts };
