import React, { useState } from 'react';
import { useApi } from '../hooks/useApi';

export default function Offers() {
  const { data, loading } = useApi('/dirk/offers');
  const { data: planData } = useApi('/mealplan/current');
  const [filter, setFilter] = useState('Alle');
  const [search, setSearch] = useState('');

  const offers = data?.offers || [];
  const plan = planData?.mealPlan;

  // Get items used in current plan
  const planItems = new Set();
  if (plan?.shoppingList) {
    plan.shoppingList.forEach(i => {
      if (i.isOffer) planItems.add((i.item || '').toLowerCase());
    });
  }

  // Get unique categories
  const categories = ['Alle', ...new Set(offers.map(o => o.category).filter(Boolean))];

  // Filter
  const filtered = offers.filter(o => {
    if (filter !== 'Alle' && o.category !== filter) return false;
    if (search && !(o.title || '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <svg className="animate-spin h-8 w-8 text-orange-500" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Zoek aanbiedingen..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-slate-800 text-white placeholder-slate-500 rounded-xl px-4 py-3 pl-10 outline-none focus:ring-2 focus:ring-orange-500"
        />
        <span className="absolute left-3 top-3.5 text-slate-500">🔍</span>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              filter === cat
                ? 'bg-orange-500 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Count */}
      <p className="text-xs text-slate-500">{filtered.length} aanbiedingen</p>

      {/* Offers Grid */}
      <div className="grid grid-cols-1 gap-3">
        {filtered.map((offer, i) => {
          const inPlan = planItems.has((offer.title || '').toLowerCase());
          const savings = (offer.original_price || 0) - (offer.discount_price || 0);

          return (
            <div
              key={offer.id || i}
              className={`bg-slate-800 rounded-xl p-4 ${inPlan ? 'ring-2 ring-orange-500/50' : ''}`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{offer.title}</h3>
                    {inPlan && <span className="text-[10px] bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full">in weekplan</span>}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {offer.brand_name && `${offer.brand_name} · `}
                    {offer.descriptive_size}
                  </p>
                </div>
                <div className="text-right ml-3">
                  {offer.original_price > 0 && offer.original_price !== offer.discount_price && (
                    <p className="text-xs text-slate-500 line-through">€{offer.original_price.toFixed(2)}</p>
                  )}
                  <p className="text-lg font-bold text-green-400">€{(offer.discount_price || offer.original_price || 0).toFixed(2)}</p>
                  {savings > 0 && (
                    <p className="text-[10px] text-green-400">-€{savings.toFixed(2)}</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <p className="text-4xl mb-3">🏷️</p>
          <p>Geen aanbiedingen gevonden.</p>
        </div>
      )}
    </div>
  );
}
