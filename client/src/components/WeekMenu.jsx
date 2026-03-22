import React, { useState } from 'react';
import { useApi } from '../hooks/useApi';
import RecipeCard from './RecipeCard';

export default function WeekMenu() {
  const { data, loading } = useApi('/mealplan/current');
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [expandedDay, setExpandedDay] = useState(null);

  const plan = data?.mealPlan;

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

  if (!plan) {
    return (
      <div className="text-center py-12 text-slate-500 px-4">
        <p className="text-4xl mb-3">🍽️</p>
        <p>Nog geen weekmenu.</p>
        <p className="text-sm mt-1">Genereer eerst een weekplan op het Home scherm.</p>
      </div>
    );
  }

  if (selectedRecipe) {
    return <RecipeCard recipe={selectedRecipe} onBack={() => setSelectedRecipe(null)} />;
  }

  return (
    <div className="p-4 space-y-3">
      {/* Daily Averages */}
      {plan.dailyAverages && (
        <div className="bg-slate-800 rounded-xl p-3 flex justify-around text-center text-sm">
          <div><p className="text-slate-400 text-xs">Kcal/dag</p><p className="font-bold text-orange-400">{plan.dailyAverages.kcal}</p></div>
          <div><p className="text-slate-400 text-xs">Eiwit/dag</p><p className="font-bold text-green-400">{plan.dailyAverages.protein}g</p></div>
          <div><p className="text-slate-400 text-xs">Koolh/dag</p><p className="font-bold text-blue-400">{plan.dailyAverages.carbs}g</p></div>
          <div><p className="text-slate-400 text-xs">Vet/dag</p><p className="font-bold text-yellow-400">{plan.dailyAverages.fat}g</p></div>
        </div>
      )}

      {/* Days */}
      {plan.weekMenu?.map((day, i) => (
        <div key={i} className="bg-slate-800 rounded-xl overflow-hidden">
          <button
            onClick={() => setExpandedDay(expandedDay === i ? null : i)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-700/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">{getDayEmoji(i)}</span>
              <span className="font-semibold">{day.day}</span>
            </div>
            <span className={`text-slate-400 transition-transform ${expandedDay === i ? 'rotate-180' : ''}`}>▼</span>
          </button>

          {expandedDay === i && (
            <div className="px-4 pb-4 space-y-3">
              {/* Breakfast - always banana bread */}
              <div className="bg-slate-700/30 rounded-lg p-3">
                <p className="text-xs text-slate-400 mb-1">Ontbijt</p>
                <p className="font-medium">🍌 Bananenbrood</p>
                <p className="text-xs text-slate-400 mt-1">~400 kcal · 15g eiwit</p>
              </div>

              {/* Lunch */}
              {day.meals?.lunch && (
                <MealCard
                  label="Lunch"
                  meal={day.meals.lunch}
                  onClick={() => setSelectedRecipe(day.meals.lunch)}
                />
              )}

              {/* Dinner */}
              {day.meals?.dinner && (
                <MealCard
                  label="Diner"
                  meal={day.meals.dinner}
                  onClick={() => setSelectedRecipe(day.meals.dinner)}
                />
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function MealCard({ label, meal, onClick }) {
  const hasOfferIngredients = meal.ingredients?.some(i => i.isOffer);
  return (
    <button onClick={onClick} className="w-full bg-slate-700/30 rounded-lg p-3 text-left hover:bg-slate-700/50 transition-colors active:scale-[0.98]">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xs text-slate-400 mb-1">{label}</p>
          <p className="font-medium">{meal.name}</p>
        </div>
        {hasOfferIngredients && <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">🏷️ aanbieding</span>}
      </div>
      <div className="flex gap-4 mt-2 text-xs text-slate-400">
        <span>⏱️ {meal.prepTime}</span>
        {meal.macros && (
          <>
            <span>🔥 {meal.macros.kcal} kcal</span>
            <span>💪 {meal.macros.protein}g eiwit</span>
          </>
        )}
        {meal.cost > 0 && <span>💰 €{meal.cost.toFixed(2)}</span>}
      </div>
    </button>
  );
}

function getDayEmoji(index) {
  const emojis = ['🟠', '🔵', '🟢', '🟡', '🔴', '🟣', '⚪'];
  return emojis[index] || '🟠';
}
