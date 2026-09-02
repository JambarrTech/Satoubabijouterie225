import { useEffect, useState } from 'react';
import { Sparkles, Wrench, Phone  } from '../../ui/Icons';;
import { apiGet, apiPut } from '../../lib/apiClient';
import { CustomRequest, RepairRequest } from '../../types';

const CUSTOM_STATUSES = [
  { value: 'PENDING', label: 'En attente', color: 'bg-amber-100 text-amber-800' },
  { value: 'IN_PROGRESS', label: 'En cours', color: 'bg-blue-100 text-blue-800' },
  { value: 'QUOTE_SENT', label: 'Devis envoyé', color: 'bg-purple-100 text-purple-800' },
  { value: 'APPROVED', label: 'Approuvé', color: 'bg-emerald-100 text-emerald-800' },
  { value: 'COMPLETED', label: 'Terminé', color: 'bg-gray-100 text-gray-800' },
  { value: 'CANCELLED', label: 'Annulé', color: 'bg-red-100 text-red-800' },
];

const REPAIR_STATUSES = [
  { value: 'RECEIVED', label: 'Reçu', color: 'bg-amber-100 text-amber-800' },
  { value: 'IN_PROGRESS', label: 'En cours', color: 'bg-blue-100 text-blue-800' },
  { value: 'WAITING_PARTS', label: 'Attente pièces', color: 'bg-purple-100 text-purple-800' },
  { value: 'COMPLETED', label: 'Terminé', color: 'bg-emerald-100 text-emerald-800' },
  { value: 'DELIVERED', label: 'Livré', color: 'bg-gray-100 text-gray-800' },
  { value: 'CANCELLED', label: 'Annulé', color: 'bg-red-100 text-red-800' },
];

export function GerantCustom() {
  const [customRequests, setCustomRequests] = useState<any[]>([]);
  const [repairs, setRepairs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = () => {
    Promise.all([
      apiGet('/api/custom-requests/all'),
      apiGet('/api/repairs/all')
    ]).then(([customData, repairsData]) => {
      setCustomRequests(customData as CustomRequest[]);
      setRepairs(repairsData as RepairRequest[]);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setError('Erreur de chargement');
      setLoading(false);
    });
  };

  useEffect(() => { fetchData(); }, []);

  const handleCustomStatus = async (id: string, status: string) => {
    try {
      await apiPut(`/api/custom-requests/${id}/status`, { status });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRepairStatus = async (id: string, status: string) => {
    try {
      await apiPut(`/api/repairs/${id}/status`, { status });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const getCustomStatusConfig = (status: string) => CUSTOM_STATUSES.find(s => s.value === status) || CUSTOM_STATUSES[0];
  const getRepairStatusConfig = (status: string) => REPAIR_STATUSES.find(s => s.value === status) || REPAIR_STATUSES[0];

  return (
    <div className="space-y-8">
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <h2 className="font-serif text-2xl font-bold text-gray-900">Demandes Sur-Mesure & SAV</h2>
        <p className="text-sm text-gray-500">Gérez les projets de création personnalisée et les demandes de réparation en atelier.</p>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-xl">{error}</p>}

      {/* Custom Requests */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
        <h3 className="font-serif text-lg font-bold text-gray-900 flex items-center gap-2">
          <Sparkles size={18} className="text-[#D9A441]" />
          Projets Sur-Mesure ({customRequests.length})
        </h3>

        <div className="grid grid-cols-1 gap-4">
          {customRequests.map(req => {
            const statusCfg = getCustomStatusConfig(req.status);
            return (
              <div key={req.id} className="p-5 rounded-2xl border border-gray-100 bg-gray-50/50 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-bold text-[#0B5D1E] bg-[#EAF7ED] px-2.5 py-1 rounded-full">{req.id}</span>
                    <h4 className="font-serif font-bold text-gray-900 mt-2">{req.jewelryType}</h4>
                  </div>
                  <span className="font-serif font-bold text-[#D9A441] text-base">{req.budget ? `${Number(req.budget).toLocaleString()} FCFA` : '-'}</span>
                </div>
                <p className="text-sm text-gray-600"><strong className="text-gray-900">Matière:</strong> {req.material}</p>
                <p className="text-sm text-gray-600"><strong className="text-gray-900">Instructions:</strong> {req.description}</p>
                <div className="flex items-center justify-between pt-2 border-t border-gray-200/50">
                  <span className="flex items-center gap-1.5 font-medium text-gray-800 text-xs">
                    <Phone size={14} className="text-[#0B5D1E]" /> {req.user?.name || 'Client'} ({req.phone})
                  </span>
                  <select
                    value={req.status}
                    onChange={(e) => handleCustomStatus(req.id, e.target.value)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-xl border focus:outline-none cursor-pointer ${statusCfg.color}`}
                  >
                    {CUSTOM_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>
            );
          })}
          {customRequests.length === 0 && !loading && (
            <p className="text-sm text-gray-500 py-4 text-center">Aucune demande de création en cours.</p>
          )}
        </div>
      </div>

      {/* Repairs */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
        <h3 className="font-serif text-lg font-bold text-gray-900 flex items-center gap-2">
          <Wrench size={18} className="text-[#0B5D1E]" />
          Demandes de Réparation & SAV ({repairs.length})
        </h3>

        <div className="grid grid-cols-1 gap-4">
          {repairs.map(rep => {
            const statusCfg = getRepairStatusConfig(rep.status);
            return (
              <div key={rep.id} className="p-5 rounded-2xl border border-gray-100 bg-gray-50/50 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full">{rep.id}</span>
                    <h4 className="font-serif font-bold text-gray-900 mt-2">{rep.jewelryType} — {rep.problemType}</h4>
                  </div>
                </div>
                <p className="text-sm text-gray-600"><strong className="text-gray-900">Description:</strong> {rep.description}</p>
                {Array.isArray(rep.photos) && rep.photos.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {rep.photos.map((photo: string, idx: number) => (
                      <img key={idx} src={photo} alt={`Photo ${idx + 1}`} className="w-16 h-16 rounded-lg object-cover border border-gray-200" referrerPolicy="no-referrer" />
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 border-t border-gray-200/50">
                  <span className="flex items-center gap-1.5 font-medium text-gray-800 text-xs">
                    <Phone size={14} className="text-[#0B5D1E]" /> {rep.user?.name || 'Client'} ({rep.phone})
                  </span>
                  <select
                    value={rep.status}
                    onChange={(e) => handleRepairStatus(rep.id, e.target.value)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-xl border focus:outline-none cursor-pointer ${statusCfg.color}`}
                  >
                    {REPAIR_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>
            );
          })}
          {repairs.length === 0 && !loading && (
            <p className="text-sm text-gray-500 py-4 text-center">Aucune demande de réparation en cours.</p>
          )}
        </div>
      </div>
    </div>
  );
}

