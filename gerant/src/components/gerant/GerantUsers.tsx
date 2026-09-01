import React, { useEffect, useState } from 'react';
import { Users, Trash2, ShieldCheck, Shield, UserCheck, Search, KeyRound, Phone, Calendar, Plus } from 'lucide-react';
import { apiGet, apiPost, apiPut, apiDelete } from '../../lib/apiClient';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { User } from '../../types';

interface UserWithCounts extends User {
  ordersCount: number;
  favoritesCount: number;
}

export function GerantUsers() {
  const [users, setUsers] = useState<UserWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newIdentifier, setNewIdentifier] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState('ARTISAN');

  const fetchUsers = () => {
    apiGet('/api/users')
      .then(data => {
        setUsers(data as UserWithCounts[]);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      setError('');
      await apiPut(`/api/users/${userId}/role`, { role: newRole });
      fetchUsers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors du changement de rôle');
    }
  };

  const handleDelete = async (userId: string, userName: string) => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer l'utilisateur "${userName}" ? Cette action est irréversible.`)) {
      try {
        setError('');
        await apiDelete(`/api/users/${userId}`);
        fetchUsers();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
      }
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await apiPost('/api/users', {
        name: newName,
        identifier: newIdentifier,
        password: newPassword,
        phone: newPhone,
        role: newRole,
      });
      setIsModalOpen(false);
      setNewName('');
      setNewIdentifier('');
      setNewPassword('');
      setNewPhone('');
      setNewRole('ARTISAN');
      fetchUsers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création');
    }
  };

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.identifier.toLowerCase().includes(search.toLowerCase()) ||
    (u.phone && u.phone.includes(search))
  );

  const roleConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    ADMIN: { label: 'Admin', icon: <ShieldCheck size={14} />, color: 'bg-purple-100 text-purple-700' },
    ARTISAN: { label: 'Artisan', icon: <Shield size={14} />, color: 'bg-blue-100 text-blue-700' },
    CUSTOMER: { label: 'Client', icon: <UserCheck size={14} />, color: 'bg-[#EAF7ED] text-[#0B5D1E]' },
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div>
          <h2 className="font-serif text-2xl font-bold text-gray-900">Gestion des Utilisateurs</h2>
          <p className="text-sm text-gray-500">Gérez les comptes clients, artisans et administrateurs.</p>
        </div>
        <div className="flex gap-3">
          <div className="bg-[#EAF7ED] px-4 py-2 rounded-2xl text-[#0B5D1E] font-semibold text-xs">
            {users.length} Utilisateurs
          </div>
          <Button onClick={() => setIsModalOpen(true)} icon={<Plus size={18} />}>
            Ajouter un utilisateur
          </Button>
        </div>
      </div>

      {/* Search bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
        <Search size={20} className="text-gray-400 ml-2" />
        <input
          type="text"
          placeholder="Rechercher par nom, identifiant ou téléphone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-transparent text-sm focus:outline-none"
        />
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-xl">{error}</p>}

      {/* Users Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100 text-gray-400 text-xs uppercase tracking-wider">
                <th className="p-4 font-semibold">Utilisateur</th>
                <th className="p-4 font-semibold">Contact</th>
                <th className="p-4 font-semibold">Rôle</th>
                <th className="p-4 font-semibold">Inscrit le</th>
                <th className="p-4 font-semibold">Activité</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredUsers.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="p-12 text-center">
                    <Users size={40} className="mx-auto text-gray-300 mb-4" />
                    <h3 className="font-serif text-lg font-bold text-gray-900">Aucun utilisateur</h3>
                    <p className="text-sm text-gray-500 mt-1">Les utilisateurs apparaîtront ici.</p>
                  </td>
                </tr>
              )}
              {filteredUsers.map(user => {
                const role = roleConfig[user.role] || roleConfig.CUSTOMER;
                return (
                  <tr key={user.id} className="hover:bg-gray-50/50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#EAF7ED] text-[#0B5D1E] flex items-center justify-center font-bold text-sm shrink-0">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{user.name}</p>
                          <span className="text-xs text-gray-400">ID: {user.id}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <KeyRound size={12} className="text-gray-400" />
                          <span className="text-xs font-mono">{user.identifier}</span>
                        </div>
                        {user.phone && (
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <Phone size={12} className="text-gray-400" />
                            <span className="text-xs">{user.phone}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-xl border focus:outline-none cursor-pointer ${role.color}`}
                      >
                        <option value="CUSTOMER">Client</option>
                        <option value="ARTISAN">Artisan</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5 text-gray-500">
                        <Calendar size={12} />
                        <span className="text-xs">{new Date(user.createdAt).toLocaleDateString('fr-FR')}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2 text-xs text-gray-500">
                        <span className="bg-gray-100 px-2 py-1 rounded-lg">{user.ordersCount} cmd</span>
                        <span className="bg-gray-100 px-2 py-1 rounded-lg">{user.favoritesCount} favoris</span>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleDelete(user.id, user.name)}
                        className="p-2 text-gray-500 hover:text-red-600 bg-gray-100 hover:bg-red-50 rounded-xl transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Créer un utilisateur">
        <form onSubmit={handleCreateUser} className="space-y-4">
          {error && <p className="text-xs text-red-600 bg-red-50 p-3 rounded-xl">{error}</p>}
          <Input label="Nom complet" value={newName} onChange={(e) => setNewName(e.target.value)} required />
          <Input label="Identifiant" value={newIdentifier} onChange={(e) => setNewIdentifier(e.target.value)} required />
          <Input label="Mot de passe (min 8 caractères)" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
          <Input label="Téléphone (optionnel)" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Rôle</label>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:outline-none focus:border-[#0B5D1E]"
            >
              <option value="ARTISAN">Artisan</option>
              <option value="ADMIN">Administrateur</option>
            </select>
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>Annuler</Button>
            <Button type="submit">Créer l'utilisateur</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
