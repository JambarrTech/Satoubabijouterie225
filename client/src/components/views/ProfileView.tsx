import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { User as UserIcon, Package, Heart, Wrench, Sparkles, LogOut, Check, Loader2 } from 'lucide-react';
import { User } from '../../types';
import { fetchCurrentUser, updateCurrentUser } from '../../lib/api/auth';
import { useToast } from '../ui/Toast';

interface ProfileViewProps {
  onNavigate: (tab: string) => void;
  onLogout: () => void;
  onProfileUpdate?: (user: User) => void;
}

export function ProfileView({ onNavigate, onLogout, onProfileUpdate }: ProfileViewProps) {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchCurrentUser()
      .then((u) => {
        setUser(u);
        setName(u.name);
        setPhone(u.phone || '');
        setAddress(u.address || '');
        setCity(u.city || '');
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    setSuccess('');
    try {
      const updated = await updateCurrentUser({ name, phone, address, city });
      setUser(updated);
      if (onProfileUpdate) onProfileUpdate(updated);
      localStorage.setItem('satouba_user', JSON.stringify(updated));
      toast('Profil mis à jour avec succès', 'success');
      setSuccess('Profil mis à jour avec succès');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      toast('Erreur lors de la mise à jour', 'error');
      console.error(e);
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-6">
        <div className="h-32 w-full rounded-3xl bg-gray-100 animate-pulse" />
        <div className="h-64 w-full rounded-3xl bg-gray-100 animate-pulse" />
      </div>
    );
  }

  const menuItems = [
    { label: 'Mes commandes', icon: Package, tab: 'commandes' },
    { label: 'Favoris', icon: Heart, tab: 'favoris' },
    { label: 'Sur-mesure', icon: Sparkles, tab: 'sur-mesure' },
    { label: 'Réparations', icon: Wrench, tab: 'reparation' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Profile header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-gradient-to-r from-[#0B5D1E] to-[#064A15] p-6 sm:p-8 rounded-3xl text-white flex flex-col sm:flex-row items-center gap-6 shadow-xl"
      >
        <div className="relative">
          <img
            src={user?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80"}
            alt=""
            className="w-24 h-24 rounded-full object-cover border-4 border-white/20 shadow-lg"
            referrerPolicy="no-referrer"
          />
          <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-[#D9A441] rounded-full flex items-center justify-center shadow-md">
            <UserIcon size={14} className="text-white" />
          </div>
        </div>
        <div className="text-center sm:text-left space-y-1 flex-1">
          <span className="px-3 py-1 rounded-full bg-[#D9A441] text-white text-[10px] font-bold uppercase tracking-widest">
            Client VIP SaTouba
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold">{user?.name}</h1>
          <p className="text-xs text-emerald-200">@{user?.identifier}</p>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors"
        >
          <LogOut size={16} />
          Déconnexion
        </button>
      </motion.div>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {menuItems.map((item, idx) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 + idx * 0.07 }}
              whileHover={{ y: -3 }}
              onClick={() => onNavigate(item.tab)}
              className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs hover:border-[#0B5D1E] hover:shadow-md transition-all cursor-pointer flex flex-col items-center text-center group"
            >
              <div className="p-3 rounded-full bg-[#EAF7ED] text-[#0B5D1E] mb-3 group-hover:bg-[#0B5D1E] group-hover:text-white transition-colors duration-300">
                <Icon size={20} />
              </div>
              <span className="font-serif font-semibold text-sm text-gray-900">{item.label}</span>
            </motion.div>
          );
        })}
      </div>

      {/* Profile form */}
      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        onSubmit={handleUpdate}
        className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6"
      >
        <h3 className="font-serif text-xl font-bold text-gray-900 pb-4 border-b border-gray-100">
          Informations personnelles
        </h3>

        {success && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="text-xs text-emerald-600 bg-emerald-50 p-3 rounded-xl font-medium flex items-center gap-1.5"
          >
            <Check size={16} />
            {success}
          </motion.div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Nom complet</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#0B5D1E] focus:ring-2 focus:ring-[#0B5D1E]/10 transition-all"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Téléphone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#0B5D1E] focus:ring-2 focus:ring-[#0B5D1E]/10 transition-all"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Adresse de livraison</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#0B5D1E] focus:ring-2 focus:ring-[#0B5D1E]/10 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Ville</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#0B5D1E] focus:ring-2 focus:ring-[#0B5D1E]/10 transition-all"
            />
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <motion.button
            type="submit"
            disabled={isUpdating}
            whileHover={{ scale: isUpdating ? 1 : 1.01 }}
            whileTap={{ scale: isUpdating ? 1 : 0.98 }}
            className="bg-[#0B5D1E] hover:bg-[#064A15] text-white px-8 py-3 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md shadow-[#0B5D1E]/20"
          >
            {isUpdating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Enregistrement...
              </>
            ) : 'Enregistrer les modifications'}
          </motion.button>
        </div>
      </motion.form>

    </div>
  );
}
