import { useState } from 'react';
import { LayoutDashboard, Package, ShoppingBag, Sparkles, Users, UserCog, Settings, ShieldCheck } from 'lucide-react';
import { GerantOverview } from './GerantOverview';
import { GerantProducts } from './GerantProducts';
import { GerantOrders } from './GerantOrders';
import { GerantCustom } from './GerantCustom';
import { GerantCustomers } from './GerantCustomers';
import { GerantUsers } from './GerantUsers';
import { GerantSettings } from './GerantSettings';

interface GerantDashboardProps {
  onSwitchToClient: () => void;
}

export function GerantDashboard({ onSwitchToClient }: GerantDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'orders' | 'custom' | 'customers' | 'users' | 'settings'>('overview');

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-72 bg-[#064A15] text-white p-6 flex flex-col justify-between shrink-0 shadow-xl">
        <div className="space-y-8">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white p-0.5 flex items-center justify-center shrink-0 border border-[#D9A441]">
              <img src="/logo.jpg" alt="SaTouba" className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="font-serif text-lg font-bold tracking-tight text-white block leading-none">SaTouba</span>
              <span className="text-[11px] text-[#D9A441] tracking-widest uppercase font-semibold">Espace Gérant</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'overview' ? 'bg-white text-[#0B5D1E] shadow-md font-bold' : 'text-emerald-100 hover:bg-white/10'
              }`}
            >
              <LayoutDashboard size={18} />
              <span>Vue d'ensemble</span>
            </button>

            <button
              onClick={() => setActiveTab('products')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'products' ? 'bg-white text-[#0B5D1E] shadow-md font-bold' : 'text-emerald-100 hover:bg-white/10'
              }`}
            >
              <Package size={18} />
              <span>Articles & Catalogue</span>
            </button>

            <button
              onClick={() => setActiveTab('orders')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'orders' ? 'bg-white text-[#0B5D1E] shadow-md font-bold' : 'text-emerald-100 hover:bg-white/10'
              }`}
            >
              <ShoppingBag size={18} />
              <span>Commandes Atelier</span>
            </button>

            <button
              onClick={() => setActiveTab('custom')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'custom' ? 'bg-white text-[#0B5D1E] shadow-md font-bold' : 'text-emerald-100 hover:bg-white/10'
              }`}
            >
              <Sparkles size={18} />
              <span>Sur-Mesure & SAV</span>
            </button>

            <button
              onClick={() => setActiveTab('customers')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'customers' ? 'bg-white text-[#0B5D1E] shadow-md font-bold' : 'text-emerald-100 hover:bg-white/10'
              }`}
            >
              <Users size={18} />
              <span>Base Clients & CRM</span>
            </button>

            <button
              onClick={() => setActiveTab('users')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'users' ? 'bg-white text-[#0B5D1E] shadow-md font-bold' : 'text-emerald-100 hover:bg-white/10'
              }`}
            >
              <UserCog size={18} />
              <span>Gestion Utilisateurs</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'settings' ? 'bg-white text-[#0B5D1E] shadow-md font-bold' : 'text-emerald-100 hover:bg-white/10'
              }`}
            >
              <Settings size={18} />
              <span>Paramètres & Promos</span>
            </button>
          </nav>
        </div>

        {/* Switch back to client view */}
        <div className="pt-6 border-t border-white/10 space-y-3">
          <button
            onClick={onSwitchToClient}
            className="w-full flex items-center justify-center gap-2 bg-[#D9A441] hover:bg-[#c49237] text-white py-3 px-4 rounded-xl font-semibold text-sm transition-colors shadow-sm"
          >
            <ShieldCheck size={16} />
            <span>Voir la Boutique Client</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 sm:p-10 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          {activeTab === 'overview' && <GerantOverview />}
          {activeTab === 'products' && <GerantProducts />}
          {activeTab === 'orders' && <GerantOrders />}
          {activeTab === 'custom' && <GerantCustom />}
          {activeTab === 'customers' && <GerantCustomers />}
          {activeTab === 'users' && <GerantUsers />}
          {activeTab === 'settings' && <GerantSettings />}
        </div>
      </main>
    </div>
  );
}
