import React, { useState, useEffect } from 'react';
import { Package, Truck, CheckCircle, Clock, ArrowRight, XCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { Order } from '../../types';
import { fetchOrders } from '../../lib/api/orders';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Skeleton } from '../ui/Skeleton';

export function OrdersView() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'completed'>('all');

  useEffect(() => {
    fetchOrders()
      .then((data) => {
        setOrders(data);
        if (data.length > 0) setSelectedOrder(data[0]);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      <div className="pb-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-widest text-[#0B5D1E] font-semibold block mb-1">Espace Client</span>
          <h1 className="font-serif text-3xl font-bold text-gray-900">Mes Commandes & Suivi</h1>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((n) => (
            <Skeleton key={n} className="h-32 w-full rounded-2xl" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-3xl border border-gray-100 p-8 space-y-4 max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-full bg-[#EAF7ED] text-[#0B5D1E] flex items-center justify-center mx-auto">
            <Package size={32} />
          </div>
          <h3 className="font-serif text-xl font-bold text-gray-900">Aucune commande enregistrée</h3>
          <p className="text-sm text-gray-500">Passez votre première commande pour suivre son avancement en direct dans notre atelier.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Orders list */}
          <div className="lg:col-span-5 space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer bg-white ${
                  selectedOrder?.id === order.id ? 'border-[#0B5D1E] ring-1 ring-[#0B5D1E] shadow-md' : 'border-gray-100 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-serif font-bold text-sm text-gray-900">{order.orderNumber}</span>
                  <Badge variant={order.status === 'SHIPPED' ? 'gold' : 'primary'}>
                    {order.status === 'SHIPPED' ? 'Expédié' : order.status === 'CONFIRMED' ? 'Confirmé' : order.status}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 mb-3">
                  {new Date(order.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
                <div className="flex items-center justify-between pt-3 border-t border-gray-50 text-xs">
                  <span className="text-gray-600">{order.items.length} article(s)</span>
                  <span className="font-bold text-[#D9A441]">{order.totalAmount.toLocaleString()} FCFA</span>
                </div>
              </div>
            ))}
          </div>

          {/* Detailed Selected Order Timeline */}
          {selectedOrder && (
            <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-8">
              <div className="flex items-center justify-between pb-6 border-b border-gray-100">
                <div>
                  <span className="text-xs uppercase tracking-wider text-gray-400 font-semibold">Détails de la commande</span>
                  <h3 className="font-serif text-2xl font-bold text-gray-900">{selectedOrder.orderNumber}</h3>
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-500 block">Total</span>
                  <span className="font-bold text-[#D9A441] text-lg">{selectedOrder.totalAmount.toLocaleString()} FCFA</span>
                </div>
              </div>

              {/* Items */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Articles commandés</h4>
                {selectedOrder.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
                    <img src={item.productImage} alt="" className="w-14 h-14 rounded-lg object-cover" referrerPolicy="no-referrer" />
                    <div className="flex-1">
                      <h5 className="font-serif font-medium text-sm text-gray-900">{item.productName}</h5>
                      <span className="text-xs text-gray-500">Quantité : {item.quantity} {item.selectedSize ? `• Taille ${item.selectedSize}` : ''}</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">{(item.price * item.quantity).toLocaleString()} FCFA</span>
                  </div>
                ))}
              </div>

              {/* Timeline */}
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-4">Suivi de l'atelier SaTouba</h4>
                
                <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
                  {selectedOrder.statusHistory.map((step, idx) => (
                    <div key={idx} className="relative flex items-start gap-4">
                      <div className={`absolute -left-6 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        step.completed ? 'bg-[#0B5D1E] text-white shadow-xs' : 'bg-gray-200 text-gray-500'
                      }`}>
                        {step.completed ? '✓' : idx + 1}
                      </div>
                      <div>
                        <h5 className={`text-sm font-semibold ${step.completed ? 'text-gray-900' : 'text-gray-400'}`}>
                          {step.label}
                        </h5>
                        <p className="text-xs text-gray-500">{step.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Shipping Address */}
              <div className="p-4 bg-[#EAF7ED]/40 rounded-2xl border border-[#0B5D1E]/20 text-xs space-y-1">
                <p className="font-bold text-[#064A15]">Adresse de livraison :</p>
                <p className="text-gray-700">{selectedOrder.shippingAddress.fullName} ({selectedOrder.shippingAddress.phone})</p>
                <p className="text-gray-600">{selectedOrder.shippingAddress.address}, {selectedOrder.shippingAddress.city}</p>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
