import React from 'react';

export default function RecipeCard({ recipe, onBack }) {
  if (!recipe) return null;

  return (
    <div className="p-4 space-y-4">
      {/* Back button */}
      <button onClick={onBack} className="flex items-center gap-2 text-orange-400 hover:text-orange-300 transition-colors">
        <span>←</span>
        <span className="text-sm">Terug naar weekmenu</span>
      </button>

      {/* Recipe Header */}
      <div className="bg-slate-800 rounded-xl p-5">
        <h2 className="text-xl font-bold mb-2">{recipe.name}</h2>
        <div className="flex gap-4 text-sm text-slate-400">
          <span>⏱️ {recipe.prepTime}</span>
          {recipe.cost > 0 && <span>💰 €{recipe.cost.toFixed(2)}</span>}
        </div>
      </div>

      {/* Macros */}
      {recipe.macros && (
        <div className="grid grid-cols-4 gap-2">
          <MacroBox label="Kcal" value={recipe.macros.kcal} color="orange" />
          <MacroBox label="Eiwit" value={`${recipe.macros.protein}g`} color="green" />
          <MacroBox label="Koolh" value={`${recipe.macros.carbs}g`} color="blue" />
          <MacroBox label="Vet" value={`${recipe.macros.fat}g`} color="yellow" />
        </div>
      )}

      {/* Ingredients */}
      <div className="bg-slate-800 rounded-xl p-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <span>🥘</span> Ingrediënten
        </h3>
        <div className="space-y-2">
          {recipe.ingredients?.map((ing, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-slate-300">
                {ing.name || ing}
                {ing.amount && <span className="text-slate-500 ml-2">{ing.amount}</span>}
              </span>
              {ing.price > 0 && (
                <span className={ing.isOffer ? 'text-green-400' : 'text-slate-400'}>
                  €{ing.price.toFixed(2)}
                  {ing.isOffer && ' 🏷️'}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Steps */}
      {recipe.steps && recipe.steps.length > 0 && (
        <div className="bg-slate-800 rounded-xl p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <span>👩‍🍳</span> Bereidingswijze
          </h3>
          <div className="space-y-3">
            {recipe.steps.map((step, i) => (
              <div key={i} className="flex gap-3">
                <span className="bg-orange-500/20 text-orange-400 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {i + 1}
                </span>
                <p className="text-sm text-slate-300 pt-1">{step}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MacroBox({ label, value, color }) {
  const colors = {
    orange: 'bg-orange-500/20 text-orange-400',
    green: 'bg-green-500/20 text-green-400',
    blue: 'bg-blue-500/20 text-blue-400',
    yellow: 'bg-yellow-500/20 text-yellow-400'
  };
  return (
    <div className={`${colors[color]} rounded-xl p-3 text-center`}>
      <p className="text-lg font-bold">{value}</p>
      <p className="text-xs opacity-70">{label}</p>
    </div>
  );
}
