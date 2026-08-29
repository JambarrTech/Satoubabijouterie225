import { useEffect, useState } from 'react';
import { Store, Edit, Check } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { apiPut } from '../../lib/apiClient';
import { fetchStoreSettings, StoreSettings } from '../../lib/api/settings';

export function GerantSettings() {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [editingSettings, setEditingSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState({ brand_name: '', address: '', phone_main: '', phone_secondary: '', phone_tertiary: '', email: '', instagram: '', whatsapp: '', shipping_fee: '', free_shipping_threshold: '', tagline: '', description: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStoreSettings().then(s => {
      setSettings(s);
      setSettingsForm({
        brand_name: s?.brand_name || '',
        address: s?.address || '',
        phone_main: s?.phone_main || '',
        phone_secondary: s?.phone_secondary || '',
        phone_tertiary: s?.phone_tertiary || '',
        email: s?.email || '',
        instagram: s?.instagram || '',
        whatsapp: s?.whatsapp || '',
        shipping_fee: s?.shipping_fee != null ? String(s.shipping_fee) : '',
        free_shipping_threshold: s?.free_shipping_threshold != null ? String(s.free_shipping_threshold) : '',
        tagline: s?.tagline || '',
        description: s?.description || '',
      });
    }).catch(console.error);
  }, []);

  // --- Store Settings ---
  const handleSaveSettings = async () => {
    try {
      await apiPut('/api/store-settings', settingsForm);
      setEditingSettings(false);
      fetchStoreSettings().then(setSettings).catch(console.error);
    } catch (err: any) {
      setError(err.message || 'Erreur');
    }
  };

  const fmt = (v: string | number | undefined) => v != null && v !== '' ? Number(v).toLocaleString('fr-FR') : '—';

  return (
    <div className="space-y-8">
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <h2 className="font-serif text-2xl font-bold text-gray-900">Administration & Paramètres SaTouba</h2>
        <p className="text-sm text-gray-500">Configurez les informations de la bijouterie.</p>
      </div>

      {error && <p className="text-xs text-red-600 bg-red-50 p-3 rounded-xl">{error}</p>}

      {/* Store Settings */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-serif text-lg font-bold text-gray-900 flex items-center gap-2">
            <Store size={18} className="text-[#0B5D1E]" />
            Informations de l'Atelier
          </h3>
          {!editingSettings ? (
            <Button variant="outline" size="sm" onClick={() => setEditingSettings(true)} icon={<Edit size={14} />}>Modifier</Button>
          ) : (
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveSettings} icon={<Check size={14} />}>Sauvegarder</Button>
              <Button variant="outline" size="sm" onClick={() => { setEditingSettings(false); setSettingsForm({
                brand_name: settings?.brand_name || '', address: settings?.address || '', phone_main: settings?.phone_main || '',
                phone_secondary: settings?.phone_secondary || '', phone_tertiary: settings?.phone_tertiary || '', email: settings?.email || '',
                instagram: settings?.instagram || '', whatsapp: settings?.whatsapp || '', shipping_fee: settings?.shipping_fee != null ? String(settings.shipping_fee) : '',
                free_shipping_threshold: settings?.free_shipping_threshold != null ? String(settings.free_shipping_threshold) : '', tagline: settings?.tagline || '', description: settings?.description || '',
              }); }}>Annuler</Button>
            </div>
          )}
        </div>

        {editingSettings ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Nom de la marque" value={settingsForm.brand_name} onChange={e => setSettingsForm({ ...settingsForm, brand_name: e.target.value })} />
            <Input label="Adresse" value={settingsForm.address} onChange={e => setSettingsForm({ ...settingsForm, address: e.target.value })} />
            <Input label="Téléphone principal" value={settingsForm.phone_main} onChange={e => setSettingsForm({ ...settingsForm, phone_main: e.target.value })} />
            <Input label="Téléphone 2" value={settingsForm.phone_secondary} onChange={e => setSettingsForm({ ...settingsForm, phone_secondary: e.target.value })} />
            <Input label="Téléphone 3" value={settingsForm.phone_tertiary} onChange={e => setSettingsForm({ ...settingsForm, phone_tertiary: e.target.value })} />
            <Input label="Email" value={settingsForm.email} onChange={e => setSettingsForm({ ...settingsForm, email: e.target.value })} />
            <Input label="Instagram" value={settingsForm.instagram} onChange={e => setSettingsForm({ ...settingsForm, instagram: e.target.value })} />
            <Input label="WhatsApp" value={settingsForm.whatsapp} onChange={e => setSettingsForm({ ...settingsForm, whatsapp: e.target.value })} />
            <Input label="Frais de livraison (FCFA)" type="number" value={settingsForm.shipping_fee} onChange={e => setSettingsForm({ ...settingsForm, shipping_fee: e.target.value })} />
            <Input label="Seuil livraison gratuite (FCFA)" type="number" value={settingsForm.free_shipping_threshold} onChange={e => setSettingsForm({ ...settingsForm, free_shipping_threshold: e.target.value })} />
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Tagline</label>
              <input value={settingsForm.tagline} onChange={e => setSettingsForm({ ...settingsForm, tagline: e.target.value })} className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:outline-none focus:border-[#0B5D1E]" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Description</label>
              <textarea rows={2} value={settingsForm.description} onChange={e => setSettingsForm({ ...settingsForm, description: e.target.value })} className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:outline-none focus:border-[#0B5D1E]" />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="p-4 bg-gray-50 rounded-2xl">
              <span className="text-xs text-gray-400 uppercase tracking-wider block">Nom de la marque</span>
              <span className="font-bold text-gray-900 text-base">{settings?.brand_name || '—'}</span>
            </div>
            <div className="p-4 bg-gray-50 rounded-2xl">
              <span className="text-xs text-gray-400 uppercase tracking-wider block">Adresse physique</span>
              <span className="font-bold text-gray-900 text-base">{settings?.address || '—'}</span>
            </div>
            <div className="p-4 bg-gray-50 rounded-2xl">
              <span className="text-xs text-gray-400 uppercase tracking-wider block">Contacts</span>
              <span className="font-bold text-gray-900 text-base">{settings?.phone_main || '—'}</span>
              {settings?.phone_secondary && <span className="text-gray-500 text-xs block">{settings.phone_secondary}</span>}
              {settings?.phone_tertiary && <span className="text-gray-500 text-xs block">{settings.phone_tertiary}</span>}
            </div>
            <div className="p-4 bg-gray-50 rounded-2xl">
              <span className="text-xs text-gray-400 uppercase tracking-wider block">Livraison</span>
              <span className="font-bold text-gray-900 text-base">{fmt(settings?.shipping_fee)} FCFA (gratuit &gt; {fmt(settings?.free_shipping_threshold)} FCFA)</span>
            </div>
            <div className="p-4 bg-gray-50 rounded-2xl">
              <span className="text-xs text-gray-400 uppercase tracking-wider block">Instagram</span>
              <span className="font-bold text-gray-900 text-base">{settings?.instagram || '—'}</span>
            </div>
            <div className="p-4 bg-gray-50 rounded-2xl">
              <span className="text-xs text-gray-400 uppercase tracking-wider block">Tagline</span>
              <span className="font-bold text-gray-900 text-base">{settings?.tagline || '—'}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
