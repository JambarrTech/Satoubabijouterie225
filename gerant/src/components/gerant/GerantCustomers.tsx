import { useEffect, useState } from 'react';
import { Users, Phone, ExternalLink } from 'lucide-react';
import { apiGet } from '../../lib/apiClient';
import { User } from '../../types';

interface Customer extends User {
  totalSpent: number;
  ordersCount: number;
}

export function GerantCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet('/api/customers')
      .then(data => {
        setCustomers(data as Customer[]);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-gray-900">Base Clients & CRM SaTouba</h2>
          <p className="text-sm text-gray-500">Liste des clients enregistrés et historique de leurs achats.</p>
        </div>
        <div className="bg-[#EAF7ED] px-4 py-2 rounded-2xl text-[#0B5D1E] font-semibold text-xs">
          {customers.length} Clients actifs
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100 text-gray-400 text-xs uppercase tracking-wider">
                <th className="p-4 font-semibold">Client</th>
                <th className="p-4 font-semibold">Identifiant</th>
                <th className="p-4 font-semibold">Téléphone WhatsApp</th>
                <th className="p-4 font-semibold">Commandes</th>
                <th className="p-4 font-semibold text-right">Total Dépensé</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {customers.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="p-12 text-center">
                    <Users size={40} className="mx-auto text-gray-300 mb-4" />
                    <h3 className="font-serif text-lg font-bold text-gray-900">Aucun client</h3>
                    <p className="text-sm text-gray-500 mt-1">Les clients enregistrés apparaîtront ici.</p>
                  </td>
                </tr>
              )}
              {customers.map(c => (
                <tr key={c.id} className="hover:bg-gray-50/50">
                  <td className="p-4 font-bold text-gray-900 whitespace-nowrap flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#EAF7ED] text-[#0B5D1E] flex items-center justify-center font-bold shrink-0">
                      {c.name.charAt(0)}
                    </div>
                    {c.name}
                  </td>
                  <td className="p-4 text-gray-600 whitespace-nowrap">
                    <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded-lg">{c.identifier}</span>
                  </td>
                  <td className="p-4 text-gray-600 whitespace-nowrap">
                    {c.phone ? (
                      <a href={`https://wa.me/${c.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-[#0B5D1E] transition-colors">
                        <Phone size={14} className="text-[#0B5D1E]" />
                        <span>{c.phone}</span>
                        <ExternalLink size={12} className="text-gray-300" />
                      </a>
                    ) : (
                      <span className="text-gray-300 italic">—</span>
                    )}
                  </td>
                  <td className="p-4 font-semibold text-gray-800 whitespace-nowrap">
                    {c.ordersCount} commande(s)
                  </td>
                  <td className="p-4 font-bold text-[#0B5D1E] text-right whitespace-nowrap">
                    {c.totalSpent.toLocaleString('fr-FR')} FCFA
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
