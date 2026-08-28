import React, { useEffect, useState } from 'react';
import { ShoppingBag, Clock, CheckCircle, Truck, Phone, User, MapPin } from 'lucide-react';
import { apiGet, apiPut } from '../../lib/apiClient';

export function GerantOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = () => {
    apiGet('/api/orders/all')
      .then(data => {
        setOrders(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      await apiPut(`/api/orders/${orderId}/status`, { status: newStatus });
      fetchOrders();
    } catch (err) {
      console.error(err);
    }
  };

  const statusConfig: Record<string, { label: string; color: string }> = {
    CONFIRMED: { label: 'Confirmée', color: 'bg-amber-50 text-amber-800 border-amber-200' },
    PREPARING: { label: 'En atelier', color: 'bg-blue-50 text-blue-800 border-blue-200' },
    SHIPPED: { label: 'Expédiée', color: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
    DELIVERED: { label: 'Livrée', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
    CANCELLED: { label: 'Annulée', color: 'bg-red-50 text-red-800 border-red-200' },
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-gray-900">Gestion des Commandes Clients</h2>
          <p className="text-sm text-gray-500">Suivez et pilotez l'avancement des commandes dans l'atelier SaTouba.</p>
        </div>
        <div className="bg-[#EAF7ED] px-4 py-2 rounded-2xl text-[#0B5D1E] font-semibold text-xs">
          {orders.length} Commandes totales
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {orders.length === 0 && !loading && (
          <div className="bg-white p-12 rounded-3xl border border-gray-100 shadow-sm text-center">
            <ShoppingBag size={40} className="mx-auto text-gray-300 mb-4" />
            <h3 className="font-serif text-lg font-bold text-gray-900">Aucune commande</h3>
            <p className="text-sm text-gray-500 mt-1">Les commandes apparaîtront ici une fois passées.</p>
          </div>
        )}
        {orders.map(order => (
          <div key={order.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#EAF7ED] text-[#0B5D1E] flex items-center justify-center font-bold">
                  <ShoppingBag size={20} />
                </div>
                <div>
                  <h4 className="font-serif text-lg font-bold text-gray-900">Commande {order.orderNumber}</h4>
                  <p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold text-[#0B5D1E] text-base">{order.totalAmount.toLocaleString()} FCFA</span>
                <select
                  value={order.status}
                  onChange={(e) => handleStatusChange(order.id, e.target.value)}
                  className={`text-xs font-semibold px-3 py-2 rounded-xl border focus:outline-none ${statusConfig[order.status]?.color || 'bg-gray-50 text-gray-800 border-gray-200'}`}
                >
                  {Object.entries(statusConfig).map(([value, cfg]) => (
                    <option key={value} value={value}>{cfg.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm bg-gray-50/50 p-4 rounded-2xl">
              <div className="flex items-center gap-2 text-gray-700">
                <User size={16} className="text-[#0B5D1E]" />
                <span className="font-medium">{order.customerName}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <Phone size={16} className="text-[#0B5D1E]" />
                <span>{order.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <MapPin size={16} className="text-[#0B5D1E]" />
                <span>{order.address}</span>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Articles commandés</p>
              {order.items.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center text-sm py-1 border-b border-gray-50">
                  <span className="font-medium text-gray-800">{item.productName} (x{item.quantity})</span>
                  <span className="font-bold text-gray-900">{(item.price * item.quantity).toLocaleString()} FCFA</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
