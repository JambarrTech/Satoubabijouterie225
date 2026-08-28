import React, { useEffect, useState } from 'react';
import { DollarSign, ShoppingBag, Package, Users, Sparkles, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import { apiGet } from '../../lib/apiClient';
import { fetchStoreSettings, StoreSettings } from '../../lib/api/settings';

export function GerantOverview() {
  const [stats, setStats] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<StoreSettings | null>(null);

  useEffect(() => {
    Promise.all([
      apiGet('/api/admin/stats'),
      apiGet('/api/orders/all'),
      fetchStoreSettings().catch(() => null)
    ]).then(([statsData, ordersData, settingsData]) => {
      setStats(statsData);
      setOrders(ordersData);
      setSettings(settingsData);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Chargement du tableau de bord...</div>;
  }

  const thisMonth = orders.filter(o => {
    const d = new Date(o.createdAt);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const lastMonth = orders.filter(o => {
    const d = new Date(o.createdAt);
    const now = new Date();
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return d.getMonth() === lastMonthDate.getMonth() && d.getFullYear() === lastMonthDate.getFullYear();
  });
  const growth = lastMonth.length > 0 ? Math.round(((thisMonth.length - lastMonth.length) / lastMonth.length) * 100) : (thisMonth.length > 0 ? 100 : 0);

  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-[#0B5D1E] to-[#064A15] p-6 sm:p-8 rounded-3xl text-white shadow-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-emerald-200 text-xs font-semibold">
            <Sparkles size={14} className="text-[#D9A441]" />
            <span>Administration {settings?.brand_name || 'SaTouba Bijouterie'}</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold">Tableau de Bord Gérant</h1>
          <p className="text-sm text-emerald-100 max-w-xl">
            Suivi en temps réel de l'activité de l'atelier, des commandes clients et de la gestion des stocks.
          </p>
        </div>
        <div className="bg-white/10 px-5 py-3 rounded-2xl border border-white/20 text-right">
          <p className="text-xs text-emerald-200 uppercase tracking-wider">Boutique Principale — Coursier SaTouba (Abidjan & environs)</p>
          <p className="font-serif text-lg font-bold text-white">{settings?.address || 'Koumassi, Abidjan'}</p>
          <p className="text-xs text-emerald-100">Gratuit — Remise en main propre sous 24-48h avec certificat d’authenticité.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-gray-500">
            <span className="text-xs font-bold uppercase tracking-wider">Chiffre d'Affaires</span>
            <div className="w-10 h-10 rounded-2xl bg-[#EAF7ED] text-[#0B5D1E] flex items-center justify-center">
              <DollarSign size={20} />
            </div>
          </div>
          <div className="font-serif text-2xl font-bold text-gray-900">
            {(stats?.totalRevenue || 0).toLocaleString()} <span className="text-sm font-sans font-normal text-gray-500">FCFA</span>
          </div>
          <div className="flex items-center gap-1 text-xs font-medium" style={{ color: growth >= 0 ? '#059669' : '#dc2626' }}>
            <TrendingUp size={14} />
            <span>{growth >= 0 ? '+' : ''}{growth}% ce mois</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-gray-500">
            <span className="text-xs font-bold uppercase tracking-wider">Commandes Totales</span>
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-[#D9A441] flex items-center justify-center">
              <ShoppingBag size={20} />
            </div>
          </div>
          <div className="font-serif text-2xl font-bold text-gray-900">
            {stats?.totalOrders || 0}
          </div>
          <p className="text-xs text-gray-500">Commandes validées</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-gray-500">
            <span className="text-xs font-bold uppercase tracking-wider">Articles au Catalogue</span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Package size={20} />
            </div>
          </div>
          <div className="font-serif text-2xl font-bold text-gray-900">
            {stats?.totalProducts || 0}
          </div>
          <p className="text-xs text-gray-500">Bijoux or & diamants</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-gray-500">
            <span className="text-xs font-bold uppercase tracking-wider">Clients Enregistrés</span>
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users size={20} />
            </div>
          </div>
          <div className="font-serif text-2xl font-bold text-gray-900">
            {stats?.totalCustomers || 0}
          </div>
          <p className="text-xs text-gray-500">Base CRM active</p>
        </div>
      </div>

      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="font-serif text-lg font-bold text-gray-900">Commandes Récentes</h3>
          <span className="text-xs font-semibold bg-[#EAF7ED] text-[#0B5D1E] px-3 py-1 rounded-full">
            {orders.length} au total
          </span>
        </div>

        {orders.length === 0 ? (
          <p className="text-sm text-gray-500 py-8 text-center">Aucune commande pour le moment.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 text-xs uppercase tracking-wider">
                  <th className="pb-3 font-semibold">Réf</th>
                  <th className="pb-3 font-semibold">Client</th>
                  <th className="pb-3 font-semibold">Téléphone</th>
                  <th className="pb-3 font-semibold">Montant</th>
                  <th className="pb-3 font-semibold">Paiement</th>
                  <th className="pb-3 font-semibold">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.slice(0, 10).map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50/50">
                    <td className="py-4 font-bold text-[#0B5D1E]">{order.orderNumber}</td>
                    <td className="py-4 font-medium text-gray-900">{order.customerName}</td>
                    <td className="py-4 text-gray-600">{order.phone}</td>
                    <td className="py-4 font-bold text-gray-900">{order.totalAmount.toLocaleString()} FCFA</td>
                    <td className="py-4">
                      <span className="px-2.5 py-1 rounded-full text-xs bg-gray-100 font-medium text-gray-700">
                        {order.paymentMethod}
                      </span>
                    </td>
                    <td className="py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                        order.status === 'DELIVERED' ? 'bg-[#EAF7ED] text-[#0B5D1E]' :
                        order.status === 'SHIPPED' ? 'bg-blue-50 text-blue-700' :
                        order.status === 'CANCELLED' ? 'bg-red-50 text-red-700' :
                        'bg-amber-50 text-amber-700'
                      }`}>
                        {order.status === 'DELIVERED' ? <CheckCircle size={12} /> : <Clock size={12} />}
                        {order.status === 'DELIVERED' ? 'Livré' : order.status === 'SHIPPED' ? 'Expédié' : order.status === 'CANCELLED' ? 'Annulé' : order.status === 'PREPARING' ? 'En Atelier' : 'Confirmée'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
