import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import ShoppingList from './components/ShoppingList';
import WeekMenu from './components/WeekMenu';
import Offers from './components/Offers';
import Settings from './components/Settings';

const TABS = [
  { id: 'home', label: 'Home', icon: '🏠' },
  { id: 'list', label: 'Lijst', icon: '📋' },
  { id: 'menu', label: 'Menu', icon: '🍽️' },
  { id: 'offers', label: 'Deals', icon: '🏷️' },
  { id: 'settings', label: 'Instellingen', icon: '⚙️' }
];

export default function App() {
  const [activeTab, setActiveTab] = useState('home');

  const renderScreen = () => {
    switch (activeTab) {
      case 'home': return <Dashboard onNavigate={setActiveTab} />;
      case 'list': return <ShoppingList />;
      case 'menu': return <WeekMenu />;
      case 'offers': return <Offers />;
      case 'settings': return <Settings />;
      default: return <Dashboard onNavigate={setActiveTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      {/* Header */}
      <header className="bg-gradient-to-r from-orange-600 to-orange-500 px-4 py-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🛒</span>
          <h1 className="text-lg font-bold">Dirk Budget</h1>
        </div>
        <span className="text-xs opacity-80">Slim boodschappen doen</span>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-20">
        {renderScreen()}
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 flex justify-around py-1 px-2 z-50">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center py-1.5 px-3 rounded-lg transition-colors ${
              activeTab === tab.id
                ? 'text-orange-400 bg-slate-700/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="text-lg">{tab.icon}</span>
            <span className="text-[10px] mt-0.5">{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
