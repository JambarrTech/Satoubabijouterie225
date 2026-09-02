import { useState, useEffect } from 'react';
import { ClipboardList, User, Package, ShoppingBag, Settings, LogIn, LogOut, RefreshCw  } from '../../ui/Icons';;
import { apiGet } from '../../lib/apiClient';

interface AuditLogEntry {
  id: string;
  action: string;
  entity: string | null;
  entityId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
  user: { id: string; name: string; identifier: string } | null;
}

const ACTION_ICONS: Record<string, typeof LogIn> = {
  LOGIN: LogIn,
  LOGIN_GERANT: LogIn,
  LOGOUT: LogOut,
  PRODUCT_CREATE: Package,
  PRODUCT_UPDATE: Package,
  PRODUCT_DELETE: Package,
  ORDER_STATUS_UPDATE: ShoppingBag,
  USER_CREATE: User,
  USER_ROLE_UPDATE: User,
  USER_DELETE: User,
  SETTINGS_UPDATE: Settings,
};

const ACTION_LABELS: Record<string, string> = {
  LOGIN: 'Connexion',
  LOGIN_GERANT: 'Connexion Gérant',
  LOGOUT: 'Déconnexion',
  PRODUCT_CREATE: 'Création produit',
  PRODUCT_UPDATE: 'Modification produit',
  PRODUCT_DELETE: 'Suppression produit',
  ORDER_STATUS_UPDATE: 'Changement statut commande',
  USER_CREATE: 'Création utilisateur',
  USER_ROLE_UPDATE: 'Changement rôle utilisateur',
  USER_DELETE: 'Suppression utilisateur',
  SETTINGS_UPDATE: 'Paramètres modifiés',
};

export function GerantLogs() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const LIMIT = 30;

  const fetchLogs = async (offset = 0) => {
    setLoading(true);
    try {
      const data = await apiGet(`/api/audit-logs?limit=${LIMIT}&offset=${offset}`) as { logs: AuditLogEntry[]; total: number };
      setLogs(data.logs);
      setTotal(data.total);
    } catch {
      console.error('Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(page * LIMIT);
  }, [page]);

  const formatDetails = (details: Record<string, unknown> | null) => {
    if (!details) return null;
    return Object.entries(details)
      .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
      .join(', ');
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' }) +
      ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="font-serif text-2xl font-bold text-gray-900">Journalisation</h2>
          <p className="text-sm text-gray-500">Historique des actions administrateur</p>
        </div>
        <button
          onClick={() => fetchLogs(page * LIMIT)}
          className="flex items-center gap-2 px-4 py-2 bg-[#EAF7ED] text-[#0B5D1E] rounded-xl text-sm font-medium hover:bg-[#d4f0d9] transition-colors"
        >
          <RefreshCw size={14} />
          Actualiser
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0B5D1E]"></div>
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
          <ClipboardList size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Aucune action enregistrée</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="p-4 text-left font-semibold text-gray-600">Date</th>
                  <th className="p-4 text-left font-semibold text-gray-600">Action</th>
                  <th className="p-4 text-left font-semibold text-gray-600">Utilisateur</th>
                  <th className="p-4 text-left font-semibold text-gray-600">Détails</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const Icon = ACTION_ICONS[log.action] || ClipboardList;
                  return (
                    <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 text-gray-500 whitespace-nowrap">{formatDate(log.createdAt)}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-[#EAF7ED] flex items-center justify-center">
                            <Icon size={14} className="text-[#0B5D1E]" />
                          </div>
                          <span className="font-medium text-gray-900">{ACTION_LABELS[log.action] || log.action}</span>
                        </div>
                      </td>
                      <td className="p-4 text-gray-600">{log.user?.name || 'Système'}</td>
                      <td className="p-4 text-gray-500 text-xs max-w-xs truncate">{formatDetails(log.details)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between p-4 border-t border-gray-100">
            <span className="text-xs text-gray-400">{total} action{total > 1 ? 's' : ''} au total</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
              >
                Précédent
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={(page + 1) * LIMIT >= total}
                className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
              >
                Suivant
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

