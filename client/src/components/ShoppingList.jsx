import React, { useState, useEffect } from 'react';
import { useApi, apiPut } from '../hooks/useApi';

export default function ShoppingList() {
  const { data, loading, refetch } = useApi('/shopping-list/current');
  const [checkedItems, setCheckedItems] = useState(new Set());

  useEffect(() => {
    if (data?.checkedItems) {
      setCheckedItems(new Set(data.checkedItems));
    }
  }, [data]);

  const items = data?.items || [];
  const listId = data?.listId;

  const toggleItem = async (index) => {
    const newChecked = new Set(checkedItems);
    const isChecked = !newChecked.has(index);
    if (isChecked) newChecked.add(index);
    else newChecked.delete(index);
    setCheckedItems(newChecked);

    if (listId) {
      try {
        await apiPut(`/shopping-list/check/${index}`, { listId, checked: isChecked });
      } catch (e) { /* optimistic update */ }
    }
  };

  // Group items
  const fixedItems = items.filter(i => i.isFixed && !i.isBiweekly);
  const biweeklyItems = items.filter(i => i.isBiweekly);
  const recipeItems = items.filter(i => !i.isFixed && !i.isBiweekly);

  // Calculate running total
  const total = items.reduce((sum, i) => sum + (i.actualPrice || i.price || i.estimatedPrice || 0), 0);
  const checkedTotal = items.reduce((sum, i, idx) => {
    if (checkedItems.has(idx)) return sum + (i.actualPrice || i.price || i.estimatedPrice || 0);
    return sum;
  }, 0);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-4 space-y-4">
      {/* Total Bar */}
      <div className="bg-slate-800 rounded-xl p-4 flex justify-between items-center">
        <div>
          <p className="text-slate-400 text-xs">Totaal boodschappen</p>
          <p className="text-2xl font-bold">€{total.toFixed(2)}</p>
        </div>
        <div className="text-right">
          <p className="text-slate-400 text-xs">Afgevinkt</p>
          <p className="text-lg text-green-400">€{checkedTotal.toFixed(2)}</p>
        </div>
      </div>

      {/* Progress */}
      <div className="bg-slate-800/50 rounded-full h-2 overflow-hidden">
        <div
          className="bg-green-500 h-full rounded-full transition-all"
          style={{ width: `${items.length > 0 ? (checkedItems.size / items.length) * 100 : 0}%` }}
        />
      </div>
      <p className="text-slate-500 text-xs text-center">{checkedItems.size} van {items.length} items afgevinkt</p>

      {/* Fixed Weekly Items */}
      {fixedItems.length > 0 && (
        <ItemSection
          title="📌 Vaste Wekelijkse Items"
          items={fixedItems}
          startIndex={0}
          checkedItems={checkedItems}
          onToggle={toggleItem}
        />
      )}

      {/* Biweekly Items */}
      {biweeklyItems.length > 0 && (
        <ItemSection
          title="🔄 Tweewekelijks"
          items={biweeklyItems}
          startIndex={fixedItems.length}
          checkedItems={checkedItems}
          onToggle={toggleItem}
        />
      )}

      {/* Recipe Items */}
      {recipeItems.length > 0 && (
        <ItemSection
          title="🍳 Recepten Ingrediënten"
          items={recipeItems}
          startIndex={fixedItems.length + biweeklyItems.length}
          checkedItems={checkedItems}
          onToggle={toggleItem}
        />
      )}

      {items.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <p className="text-4xl mb-3">📝</p>
          <p>Nog geen boodschappenlijst.</p>
          <p className="text-sm mt-1">Genereer eerst een weekplan op het Home scherm.</p>
        </div>
      )}
    </div>
  );
}

function ItemSection({ title, items, startIndex, checkedItems, onToggle }) {
  return (
    <div className="bg-slate-800 rounded-xl overflow-hidden">
      <h3 className="font-semibold text-sm px-4 py-3 bg-slate-700/50">{title}</h3>
      <div className="divide-y divide-slate-700/50">
        {items.map((item, i) => {
          const globalIndex = startIndex + i;
          const isChecked = checkedItems.has(globalIndex);
          return (
            <button
              key={globalIndex}
              onClick={() => onToggle(globalIndex)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-700/30 active:bg-slate-700/50"
            >
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                isChecked ? 'bg-green-500 border-green-500' : 'border-slate-500'
              }`}>
                {isChecked && <span className="text-white text-xs">✓</span>}
              </div>
              <div className={`flex-1 ${isChecked ? 'line-through text-slate-500' : ''}`}>
                <p className="text-sm">{item.item || item.name}</p>
                <p className="text-xs text-slate-400">{item.quantity || item.amount}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className={`text-sm font-medium ${item.isOffer ? 'text-green-400' : ''}`}>
                  €{(item.actualPrice || item.price || item.estimatedPrice || 0).toFixed(2)}
                </p>
                {item.isOffer && <span className="text-[10px] text-green-400">🏷️ aanbieding</span>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <svg className="animate-spin h-8 w-8 text-orange-500" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
      </svg>
    </div>
  );
}
