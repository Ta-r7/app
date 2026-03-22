const Anthropic = require('@anthropic-ai/sdk');

let client = null;

function getClient() {
  if (!client) {
    client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
  }
  return client;
}

async function generateMealPlan(offers, budgetInfo, settings = {}) {
  const anthropic = getClient();

  const proteinMin = settings.protein_min || 160;
  const proteinMax = settings.protein_max || 180;
  const kcalMin = settings.kcal_min || 3300;
  const kcalMax = settings.kcal_max || 3500;

  // Include standard products context
  const standardProductsText = [
    ...budgetInfo.weeklyItems.map(i => `- ${i.item} (${i.quantity}): €${i.actualPrice.toFixed(2)}${i.isOffer ? ' (AANBIEDING!)' : ''} [wekelijks]`),
    ...budgetInfo.biweeklyItems.map(i => `- ${i.item} (${i.quantity}): €${i.actualPrice.toFixed(2)}${i.isOffer ? ' (AANBIEDING!)' : ''} [tweewekelijks, deze week]`)
  ].join('\n');

  const offersText = offers.map(o => {
    const orig = o.original_price || o.originalPrice || 0;
    const disc = o.discount_price || o.discountPrice || orig;
    const size = o.descriptive_size || o.descriptiveSize || '';
    return `- ${o.title} (${size}): was €${orig.toFixed(2)}, nu €${disc.toFixed(2)}`;
  }).join('\n');

  const systemPrompt = `Je bent een Nederlandse maaltijdplanner. Je genereert een weekmenu op basis van de context die je krijgt.
Je output is ALTIJD geldige JSON, zonder markdown formatting of code blocks. Geen tekst voor of na de JSON.`;

  const userPrompt = `Genereer een weekmenu op basis van de volgende context:

BUDGET: €${budgetInfo.remainingBudget.toFixed(2)} (na aftrek vaste items van €${budgetInfo.totalFixedCost.toFixed(2)})
TOTAAL WEEKBUDGET: €${budgetInfo.totalBudget.toFixed(2)}

VOEDINGSDOELEN PER DAG: ${proteinMin}-${proteinMax}g eiwit, ${kcalMin}-${kcalMax} kcal

STANDAARD PRODUCTEN (al ingecalculeerd in budget):
${standardProductsText}

VASTE MAALTIJDEN (al ingecalculeerd):
- Ontbijt: Bananenbrood (elke dag, ~400 kcal, ~15g eiwit per portie)
- De resterende ~${proteinMin - 15}-${proteinMax - 15}g eiwit moet uit lunch + diner + snacks komen
- Houd rekening met standaard producten bij het plannen (gebruik ze waar mogelijk in recepten)

DIRK AANBIEDINGEN DEZE WEEK:
${offersText}

REGELS:
1. Maximaliseer gebruik van aanbiedingsproducten
2. Blijf STRIKT binnen budget van €${budgetInfo.remainingBudget.toFixed(2)}
3. Elke maaltijd moet bereidingstijd van 30-60 min hebben
4. Focus op hoog eiwit: veel kip, gehakt, eieren, kwark, peulvruchten, tonijn
5. Geef per recept: naam, ingrediënten met hoeveelheden, bereidingstijd, macro's
6. Denk aan ingrediënten die in meerdere recepten gebruikt worden (efficiëntie)
7. Reken voor elk recept de totale kosten uit
8. Geef een totaaloverzicht van alle benodigde boodschappen met prijzen
9. Alle tekst in het Nederlands

Genereer output als JSON met EXACT dit schema:
{
  "weekMenu": [
    {
      "day": "Maandag",
      "meals": {
        "lunch": { "name": "", "prepTime": "30 min", "ingredients": [{"name": "", "amount": "", "price": 0}], "macros": {"kcal": 0, "protein": 0, "carbs": 0, "fat": 0}, "cost": 0, "steps": ["stap 1", "stap 2"] },
        "dinner": { "name": "", "prepTime": "45 min", "ingredients": [{"name": "", "amount": "", "price": 0}], "macros": {"kcal": 0, "protein": 0, "carbs": 0, "fat": 0}, "cost": 0, "steps": ["stap 1", "stap 2"] }
      }
    }
  ],
  "shoppingList": [
    { "item": "", "quantity": "", "price": 0, "isOffer": true, "savings": 0, "category": "" }
  ],
  "totalCost": 0,
  "totalSavings": 0,
  "dailyAverages": { "kcal": 0, "protein": 0, "carbs": 0, "fat": 0 }
}`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8000,
    messages: [
      { role: 'user', content: userPrompt }
    ],
    system: systemPrompt
  });

  const text = response.content[0].text;

  // Try to parse JSON, stripping any markdown code blocks
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  return JSON.parse(cleaned);
}

module.exports = { generateMealPlan };
