import React, { useState, useEffect } from 'react';
import { useApi, apiPut, apiPost } from '../hooks/useApi';

export default function Settings() {
  const { data: settings, loading, refetch: refetchSettings } = useApi('/settings');
  const { data: productsData, refetch: refetchProducts } = useApi('/standard-products');
  const [form, setForm] = useState({});
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  const products = productsData?.products || [];

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiPut('/settings', form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      refetchSettings();
    } catch (e) {
      alert('Opslaan mislukt: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const updateField = (key, value) => {
    setForm(f => ({ ...f, [key]: value }));
    setSaved(false);
  };

  const handleDeleteProduct = async (id) => {
    if (!confirm('Weet je zeker dat je dit product wilt verwijderen?')) return;
    try {
      await fetch(`/api/standard-products/${id}`, { method: 'DELETE' });
      refetchProducts();
    } catch (e) { alert('Verwijderen mislukt'); }
  };

  const handleToggleProduct = async (product) => {
    try {
      await apiPut(`/standard-products/${product.id}`, { ...product, active: !product.active });
      refetchProducts();
    } catch (e) { /* ignore */ }
  };

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
      <h2 className="text-lg font-bold">Instellingen</h2>

      {/* Nutrition Targets */}
      <SettingSection title="🎯 Voedingsdoelen per dag">
        <p className="text-xs text-slate-400 mb-3">De app berekent recepten die aan deze doelen voldoen.</p>
        <div className="grid grid-cols-2 gap-3">
          <InputField
            label="Eiwit min (g)"
            value={form.protein_min || '160'}
            onChange={v => updateField('protein_min', v)}
            type="number"
          />
          <InputField
            label="Eiwit max (g)"
            value={form.protein_max || '180'}
            onChange={v => updateField('protein_max', v)}
            type="number"
          />
          <InputField
            label="Kcal min"
            value={form.kcal_min || '3300'}
            onChange={v => updateField('kcal_min', v)}
            type="number"
          />
          <InputField
            label="Kcal max"
            value={form.kcal_max || '3500'}
            onChange={v => updateField('kcal_max', v)}
            type="number"
          />
        </div>
        <div className="mt-3 bg-slate-700/30 rounded-lg p-3">
          <p className="text-xs text-slate-400">Samenvatting: {form.kcal_min || 3300}-{form.kcal_max || 3500} kcal en {form.protein_min || 160}-{form.protein_max || 180}g eiwit per dag</p>
        </div>
      </SettingSection>

      {/* Budget */}
      <SettingSection title="💰 Weekbudget">
        <InputField
          label="Maximaal budget (€)"
          value={form.budget || '30'}
          onChange={v => updateField('budget', v)}
          type="number"
          min="10"
          max="200"
        />
        <p className="text-xs text-slate-400 mt-2">
          Dit bedrag wordt gebruikt om recepten en boodschappen te plannen. Vaste producten worden er eerst van afgetrokken.
        </p>
      </SettingSection>

      {/* Standard Products */}
      <SettingSection title="📦 Standaard Producten">
        <p className="text-xs text-slate-400 mb-3">
          Producten die je elke week (of om de week) koopt. Deze worden automatisch van je budget afgetrokken en op je boodschappenlijst gezet. De app zoekt of ze in de aanbieding zijn.
        </p>

        {/* Product List */}
        <div className="space-y-2">
          {products.length === 0 && (
            <p className="text-center text-slate-500 text-sm py-4">Geen standaard producten. Voeg er hieronder toe.</p>
          )}

          {['weekly', 'biweekly'].map(freq => {
            const filtered = products.filter(p => p.frequency === freq);
            if (filtered.length === 0) return null;
            return (
              <div key={freq}>
                <p className="text-xs text-slate-500 font-medium mb-1 mt-2">
                  {freq === 'weekly' ? '📅 Wekelijks' : '🔄 Tweewekelijks'}
                </p>
                {filtered.map(product => (
                  <div key={product.id} className={`flex items-center gap-2 py-2 px-3 rounded-lg mb-1 ${product.active ? 'bg-slate-700/30' : 'bg-slate-700/10 opacity-50'}`}>
                    <button
                      onClick={() => handleToggleProduct(product)}
                      className={`w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center text-xs ${product.active ? 'bg-orange-500 border-orange-500 text-white' : 'border-slate-500'}`}
                    >
                      {product.active && '✓'}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{product.name}</p>
                      <p className="text-xs text-slate-400">{product.quantity}</p>
                    </div>
                    <span className="text-sm font-medium text-slate-300">€{product.estimated_price.toFixed(2)}</span>
                    <button onClick={() => setEditingProduct(product)} className="text-slate-500 hover:text-white text-xs p-1">✏️</button>
                    <button onClick={() => handleDeleteProduct(product.id)} className="text-slate-500 hover:text-red-400 text-xs p-1">🗑️</button>
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* Total */}
        {products.length > 0 && (
          <div className="mt-3 border-t border-slate-700 pt-2 flex justify-between text-sm">
            <span className="text-slate-400">Geschatte vaste kosten:</span>
            <span className="font-bold">
              €{products.filter(p => p.active && (p.frequency === 'weekly' || (p.frequency === 'biweekly' && form.biweekly_this_week !== 'false')))
                .reduce((sum, p) => sum + p.estimated_price, 0).toFixed(2)}
            </span>
          </div>
        )}

        {/* Add button */}
        <button
          onClick={() => { setShowAddProduct(true); setEditingProduct(null); }}
          className="mt-3 w-full py-2.5 border-2 border-dashed border-slate-600 text-slate-400 rounded-xl text-sm hover:border-orange-500 hover:text-orange-400 transition-colors"
        >
          + Product Toevoegen
        </button>
      </SettingSection>

      {/* Add/Edit Product Modal */}
      {(showAddProduct || editingProduct) && (
        <ProductForm
          product={editingProduct}
          onClose={() => { setShowAddProduct(false); setEditingProduct(null); }}
          onSaved={() => { setShowAddProduct(false); setEditingProduct(null); refetchProducts(); }}
        />
      )}

      {/* Biweekly Toggle */}
      <SettingSection title="🔄 Tweewekelijkse items deze week?">
        <div className="flex gap-3">
          <button
            onClick={() => updateField('biweekly_this_week', 'true')}
            className={`flex-1 py-3 rounded-xl font-medium transition-colors ${
              form.biweekly_this_week !== 'false'
                ? 'bg-orange-500 text-white'
                : 'bg-slate-700 text-slate-400'
            }`}
          >
            Ja, deze week
          </button>
          <button
            onClick={() => updateField('biweekly_this_week', 'false')}
            className={`flex-1 py-3 rounded-xl font-medium transition-colors ${
              form.biweekly_this_week === 'false'
                ? 'bg-orange-500 text-white'
                : 'bg-slate-700 text-slate-400'
            }`}
          >
            Nee, volgende week
          </button>
        </div>
      </SettingSection>

      {/* Store */}
      <SettingSection title="🏪 Winkel">
        <InputField
          label="Dirk Winkel ID"
          value={form.store_id || ''}
          onChange={v => updateField('store_id', v)}
          placeholder="bijv. 123"
          type="text"
        />
      </SettingSection>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className={`w-full py-4 rounded-xl font-bold transition-all active:scale-95 ${
          saved
            ? 'bg-green-500 text-white'
            : 'bg-orange-500 hover:bg-orange-600 text-white'
        }`}
      >
        {saving ? 'Opslaan...' : saved ? '✓ Opgeslagen!' : 'Instellingen Opslaan'}
      </button>

      {/* Info */}
      <div className="bg-slate-800 rounded-xl p-4 text-xs text-slate-500 space-y-1">
        <p>Dirk Budget App v1.0</p>
        <p>Aanbiedingen worden elke woensdag ververst.</p>
        <p>Weekplan wordt gegenereerd met AI (Claude).</p>
      </div>
    </div>
  );
}

function ProductForm({ product, onClose, onSaved }) {
  const [name, setName] = useState(product?.name || '');
  const [quantity, setQuantity] = useState(product?.quantity || '');
  const [price, setPrice] = useState(product?.estimated_price?.toString() || '');
  const [category, setCategory] = useState(product?.category || '');
  const [frequency, setFrequency] = useState(product?.frequency || 'weekly');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!name || !quantity || !price) return;
    setSaving(true);
    try {
      if (product) {
        await apiPut(`/standard-products/${product.id}`, {
          name, quantity, estimated_price: parseFloat(price), category, frequency, active: product.active
        });
      } else {
        await apiPost('/standard-products', {
          name, quantity, estimated_price: parseFloat(price), category, frequency
        });
      }
      onSaved();
    } catch (e) {
      alert('Opslaan mislukt: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="bg-slate-800 w-full max-w-lg rounded-t-2xl p-5 space-y-3" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-bold">{product ? 'Product Bewerken' : 'Product Toevoegen'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-lg">✕</button>
        </div>
        <InputField label="Naam" value={name} onChange={setName} placeholder="bijv. Volkoren brood" />
        <InputField label="Hoeveelheid" value={quantity} onChange={setQuantity} placeholder="bijv. 3 stuks" />
        <InputField label="Geschatte prijs (€)" value={price} onChange={setPrice} type="number" placeholder="bijv. 4.50" />
        <InputField label="Categorie" value={category} onChange={setCategory} placeholder="bijv. Brood, Zuivel, etc." />
        <div>
          <label className="text-xs text-slate-400 block mb-1">Frequentie</label>
          <div className="flex gap-2">
            <button
              onClick={() => setFrequency('weekly')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium ${frequency === 'weekly' ? 'bg-orange-500 text-white' : 'bg-slate-700 text-slate-400'}`}
            >Wekelijks</button>
            <button
              onClick={() => setFrequency('biweekly')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium ${frequency === 'biweekly' ? 'bg-orange-500 text-white' : 'bg-slate-700 text-slate-400'}`}
            >Tweewekelijks</button>
          </div>
        </div>
        <button
          onClick={handleSubmit}
          disabled={saving || !name || !quantity || !price}
          className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl"
        >
          {saving ? 'Opslaan...' : product ? 'Wijzigingen Opslaan' : 'Toevoegen'}
        </button>
      </div>
    </div>
  );
}

function SettingSection({ title, children }) {
  return (
    <div className="bg-slate-800 rounded-xl p-4">
      <h3 className="font-semibold text-sm mb-3">{title}</h3>
      {children}
    </div>
  );
}

function InputField({ label, value, onChange, type = 'text', placeholder, min, max }) {
  return (
    <div>
      <label className="text-xs text-slate-400 block mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        min={min}
        max={max}
        className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500"
      />
    </div>
  );
}
