import React from 'react';
import { useApi, apiPost } from '../hooks/useApi';

export default function Dashboard({ onNavigate }) {
  const { data: budget, loading: budgetLoading } = useApi('/budget');
  const { data: planData, loading: planLoading, refetch: refetchPlan } = useApi('/mealplan/current');
  const [generating, setGenerating] = React.useState(false);
  const [genError, setGenError] = React.useState(null);

  const plan = planData?.mealPlan;
  const budgetInfo = planData?.budget || budget;

  const handleGenerate = async () => {
    setGenerating(true);
    setGenError(null);
    try {
      await apiPost('/mealplan/generate', {});
      await refetchPlan();
    } catch (err) {
      setGenError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Budget Card */}
      <div className="bg-gradient-to-br from-orange-600 to-orange-700 rounded-2xl p-5 shadow-xl">
        <p className="text-orange-100 text-sm mb-1">Weekbudget</p>
        <div className="flex items-end justify-between">
          <div>
            <span className="text-4xl font-bold">€{budgetInfo?.totalFixedCost?.toFixed(2) || '—'}</span>
            <span className="text-orange-200 text-lg ml-1">/ €{budgetInfo?.totalBudget || 30}</span>
          </div>
          {budgetInfo?.totalSavings > 0 && (
            <div className="bg-green-500/20 text-green-300 px-3 py-1 rounded-full text-sm font-medium">
              -€{budgetInfo.totalSavings.toFixed(2)} bespaard
            </div>
          )}
        </div>
        <div className="mt-3 bg-orange-800/40 rounded-full h-3 overflow-hidden">
          <div
            className="bg-white/90 h-full rounded-full transition-all"
            style={{ width: `${Math.min(100, ((budgetInfo?.totalFixedCost || 0) / (budgetInfo?.totalBudget || 30)) * 100)}%` }}
          />
        </div>
        <p className="text-orange-200 text-xs mt-2">
          Resterend voor recepten: €{budgetInfo?.remainingBudget?.toFixed(2) || '—'}
        </p>
      </div>

      {/* Quick Stats */}
      {plan?.dailyAverages && (
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Calorieën/dag" value={`${plan.dailyAverages.kcal}`} unit="kcal" color="blue" />
          <StatCard label="Eiwit/dag" value={`${plan.dailyAverages.protein}`} unit="g" color="green" />
          <StatCard label="Totale kosten" value={`€${plan.totalCost?.toFixed(2)}`} unit="" color="orange" />
          <StatCard label="Totaal bespaard" value={`€${plan.totalSavings?.toFixed(2)}`} unit="" color="emerald" />
        </div>
      )}

      {/* Fixed Items Summary */}
      <div className="bg-slate-800 rounded-xl p-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <span>📌</span> Vaste Boodschappen
        </h3>
        <div className="space-y-2 text-sm">
          {budgetInfo?.weeklyItems?.map((item, i) => (
            <div key={i} className="flex justify-between text-slate-300">
              <span>{item.item} <span className="text-slate-500">{item.quantity}</span></span>
              <span className={item.isOffer ? 'text-green-400' : ''}>
                €{item.actualPrice?.toFixed(2)}
                {item.isOffer && <span className="ml-1 text-xs">🏷️</span>}
              </span>
            </div>
          ))}
          {budgetInfo?.biweeklyItems?.length > 0 && (
            <>
              <div className="border-t border-slate-700 pt-2 mt-2 text-slate-400 text-xs">Tweewekelijks (deze week)</div>
              {budgetInfo.biweeklyItems.map((item, i) => (
                <div key={`bw-${i}`} className="flex justify-between text-slate-300">
                  <span>{item.item} <span className="text-slate-500">{item.quantity}</span></span>
                  <span>€{item.actualPrice?.toFixed(2)}</span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={generating}
        className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 text-white font-bold py-4 rounded-xl shadow-lg transition-all active:scale-95"
      >
        {generating ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            Weekplan genereren...
          </span>
        ) : plan ? '🔄 Nieuw Weekplan Genereren' : '✨ Weekplan Genereren'}
      </button>

      {genError && (
        <div className="bg-red-900/30 border border-red-500/30 text-red-300 p-3 rounded-xl text-sm">
          {genError}
        </div>
      )}

      {/* Quick Navigation */}
      {plan && (
        <div className="grid grid-cols-3 gap-3">
          <QuickNav icon="📋" label="Boodschappenlijst" onClick={() => onNavigate('list')} />
          <QuickNav icon="🍽️" label="Weekmenu bekijken" onClick={() => onNavigate('menu')} />
          <QuickNav icon="🏷️" label="Aanbiedingen" onClick={() => onNavigate('offers')} />
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, unit, color }) {
  const colors = {
    blue: 'from-blue-600/20 to-blue-700/20 border-blue-500/30',
    green: 'from-green-600/20 to-green-700/20 border-green-500/30',
    orange: 'from-orange-600/20 to-orange-700/20 border-orange-500/30',
    emerald: 'from-emerald-600/20 to-emerald-700/20 border-emerald-500/30'
  };
  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-xl p-3`}>
      <p className="text-slate-400 text-xs">{label}</p>
      <p className="text-xl font-bold mt-1">{value}<span className="text-sm text-slate-400 ml-1">{unit}</span></p>
    </div>
  );
}

function QuickNav({ icon, label, onClick }) {
  return (
    <button onClick={onClick} className="bg-slate-800 hover:bg-slate-700 rounded-xl p-3 text-center transition-colors active:scale-95">
      <span className="text-2xl block">{icon}</span>
      <span className="text-[10px] text-slate-400 mt-1 block">{label}</span>
    </button>
  );
}
