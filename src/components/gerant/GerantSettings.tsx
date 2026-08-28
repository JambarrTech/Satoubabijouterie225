import React, { useEffect, useState } from 'react';
import { Tag, Store, Plus, Trash2, Edit, Check, Gem } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { apiGet, apiPost, apiPut, apiDelete } from '../../lib/apiClient';
import { fetchStoreSettings, StoreSettings } from '../../lib/api/settings';

interface MaterialPricing {
  id: string;
  name: string;
  pricePerGram: number;
  type: string;
  description: string;
}

export function GerantSettings() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [newCode, setNewCode] = useState('');
  const [newDiscount, setNewDiscount] = useState(0);
  const [newDescription, setNewDescription] = useState('');
  const [newExpiry, setNewExpiry] = useState('');
  const [editingCoupon, setEditingCoupon] = useState<any>(null);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [editingSettings, setEditingSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState({ brand_name: '', address: '', phone_main: '', phone_secondary: '', phone_tertiary: '', email: '', instagram: '', whatsapp: '', shipping_fee: '', free_shipping_threshold: '', tagline: '', description: '' });
  const [materials, setMaterials] = useState<MaterialPricing[]>([]);
  const [editingMaterial, setEditingMaterial] = useState<MaterialPricing | null>(null);
  const [matName, setMatName] = useState('');
  const [matPrice, setMatPrice] = useState(0);
  const [matType, setMatType] = useState('MATERIAL');
  const [matDesc, setMatDesc] = useState('');
  const [error, setError] = useState('');

  const fetchCoupons = () => {
    apiGet('/api/coupons/all').then(data => setCoupons(data as any[])).catch(console.error);
  };

  const fetchMaterials = () => {
    apiGet('/api/material-pricing').then(data => setMaterials(data as any[])).catch(console.error);
  };

  useEffect(() => {
    fetchCoupons();
    fetchMaterials();
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

  // --- Coupons ---
  const handleAddCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (editingCoupon) {
        await apiPut(`/api/coupons/${editingCoupon.id}`, {
          code: newCode.toUpperCase(),
          discountPercent: Number(newDiscount),
          description: newDescription,
          expiryDate: newExpiry,
        });
      } else {
        await apiPost('/api/coupons', {
          code: newCode.toUpperCase(),
          discountPercent: Number(newDiscount),
          description: newDescription,
          expiryDate: newExpiry,
        });
      }
      setNewCode('');
      setNewDiscount(0);
      setNewDescription('');
      setNewExpiry('');
      setEditingCoupon(null);
      fetchCoupons();
    } catch (err: any) {
      setError(err.message || 'Erreur');
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (confirm('Supprimer ce code promo ?')) {
      await apiDelete(`/api/coupons/${id}`);
      fetchCoupons();
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    await apiPut(`/api/coupons/${id}`, { isActive: !isActive });
    fetchCoupons();
  };

  const startEdit = (coupon: any) => {
    setEditingCoupon(coupon);
    setNewCode(coupon.code);
    setNewDiscount(coupon.discountPercent);
    setNewDescription(coupon.description || '');
    setNewExpiry(coupon.expiryDate ? new Date(coupon.expiryDate).toISOString().split('T')[0] : '2026-12-31');
  };

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

  // --- Material Pricing ---
  const handleSaveMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (editingMaterial) {
        await apiPut(`/api/material-pricing/${editingMaterial.id}`, {
          name: matName, pricePerGram: Number(matPrice), type: matType, description: matDesc,
        });
      } else {
        await apiPost('/api/material-pricing', {
          name: matName, pricePerGram: Number(matPrice), type: matType, description: matDesc,
        });
      }
      setMatName('');
      setMatPrice(0);
      setMatType('MATERIAL');
      setMatDesc('');
      setEditingMaterial(null);
      fetchMaterials();
    } catch (err: any) {
      setError(err.message || 'Erreur');
    }
  };

  const handleDeleteMaterial = async (id: string) => {
    if (confirm('Supprimer ce matériau ?')) {
      await apiDelete(`/api/material-pricing/${id}`);
      fetchMaterials();
    }
  };

  const startEditMaterial = (m: MaterialPricing) => {
    setEditingMaterial(m);
    setMatName(m.name);
    setMatPrice(m.pricePerGram);
    setMatType(m.type);
    setMatDesc(m.description || '');
  };

  const fmt = (v: string | number | undefined) => v != null && v !== '' ? Number(v).toLocaleString('fr-FR') : '—';

  return (
    <div className="space-y-8">
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <h2 className="font-serif text-2xl font-bold text-gray-900">Administration & Paramètres SaTouba</h2>
        <p className="text-sm text-gray-500">Configurez les informations de la bijouterie, les prix des matériaux et les codes promotionnels.</p>
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

      {/* Material Pricing */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
        <h3 className="font-serif text-lg font-bold text-gray-900 flex items-center gap-2">
          <Gem size={18} className="text-[#D9A441]" />
          Tarifs Matériaux ({materials.length})
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-6 space-y-3">
            {materials.map(m => (
              <div key={m.id} className="flex justify-between items-center p-4 rounded-2xl border border-gray-100 bg-gray-50/50 gap-3">
                <div className="flex-1 min-w-0">
                  <span className="font-bold text-gray-900 text-sm block">{m.name}</span>
                  <span className="text-xs text-gray-400 uppercase">{m.type}</span>
                  {m.description && <span className="text-xs text-gray-500 block">{m.description}</span>}
                </div>
                <span className="font-mono font-bold text-[#D9A441] text-sm shrink-0">{Number(m.pricePerGram).toLocaleString('fr-FR')} FCFA</span>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => startEditMaterial(m)} className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-500 hover:text-blue-600" title="Modifier">
                    <Edit size={14} />
                  </button>
                  <button onClick={() => handleDeleteMaterial(m.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600" title="Supprimer">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
            {materials.length === 0 && <p className="text-sm text-gray-500 py-4 text-center">Aucun matériau configuré.</p>}
          </div>

          <form onSubmit={handleSaveMaterial} className="lg:col-span-6 bg-gray-50 p-6 rounded-2xl border border-gray-200/60 space-y-4">
            <h4 className="font-serif font-bold text-gray-900">{editingMaterial ? 'Modifier le matériau' : 'Ajouter un matériau'}</h4>
            <Input label="Nom" value={matName} onChange={e => setMatName(e.target.value)} required />
            <Input label="Prix par unité (FCFA)" type="number" value={matPrice} onChange={e => setMatPrice(Number(e.target.value))} required />
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Type</label>
              <select value={matType} onChange={e => setMatType(e.target.value)} className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:outline-none focus:border-[#0B5D1E]">
                <option value="MATERIAL">Matériau</option>
                <option value="STONE">Pierre</option>
                <option value="LABOR">Main d'oeuvre</option>
              </select>
            </div>
            <Input label="Description" value={matDesc} onChange={e => setMatDesc(e.target.value)} />
            <div className="flex gap-2">
              <Button type="submit" icon={<Plus size={16} />} className="flex-1">{editingMaterial ? 'Mettre à jour' : 'Ajouter'}</Button>
              {editingMaterial && (
                <Button variant="outline" type="button" onClick={() => { setEditingMaterial(null); setMatName(''); setMatPrice(0); setMatType('MATERIAL'); setMatDesc(''); }}>Annuler</Button>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Coupons */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
        <h3 className="font-serif text-lg font-bold text-gray-900 flex items-center gap-2">
          <Tag size={18} className="text-[#D9A441]" />
          Codes Promo ({coupons.length})
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-6 space-y-3">
            {coupons.map(c => (
              <div key={c.id} className="flex justify-between items-center p-4 rounded-2xl border border-gray-100 bg-gray-50/50 gap-3">
                <div className="flex-1 min-w-0">
                  <span className="font-mono font-bold text-[#0B5D1E] text-base block">{c.code}</span>
                  <span className="text-xs text-gray-500">{c.description || 'Pas de description'}</span>
                  <span className="text-xs text-gray-400 block">Expire: {new Date(c.expiryDate).toLocaleDateString('fr-FR')}</span>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 ${c.isActive ? 'bg-[#EAF7ED] text-[#0B5D1E]' : 'bg-gray-100 text-gray-500'}`}>
                  -{c.discountPercent}%
                </span>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => handleToggleActive(c.id, c.isActive)} className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500" title={c.isActive ? 'Désactiver' : 'Activer'}>
                    <Check size={14} className={c.isActive ? 'text-[#0B5D1E]' : 'text-gray-400'} />
                  </button>
                  <button onClick={() => startEdit(c)} className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-500 hover:text-blue-600" title="Modifier">
                    <Edit size={14} />
                  </button>
                  <button onClick={() => handleDeleteCoupon(c.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600" title="Supprimer">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
            {coupons.length === 0 && <p className="text-sm text-gray-500 py-4 text-center">Aucun code promo.</p>}
          </div>

          <form onSubmit={handleAddCoupon} className="lg:col-span-6 bg-gray-50 p-6 rounded-2xl border border-gray-200/60 space-y-4">
            <h4 className="font-serif font-bold text-gray-900">{editingCoupon ? 'Modifier le code promo' : 'Créer un nouveau code promo'}</h4>
            <Input label="Code (ex: EID20)" value={newCode} onChange={e => setNewCode(e.target.value)} required />
            <Input label="Réduction (%)" type="number" value={newDiscount} onChange={e => setNewDiscount(Number(e.target.value))} required />
            <Input label="Description" value={newDescription} onChange={e => setNewDescription(e.target.value)} />
            <Input label="Date d'expiration" type="date" value={newExpiry} onChange={e => setNewExpiry(e.target.value)} />
            <div className="flex gap-2">
              <Button type="submit" icon={<Plus size={16} />} className="flex-1">{editingCoupon ? 'Mettre à jour' : 'Ajouter'}</Button>
              {editingCoupon && (
                <Button variant="outline" type="button" onClick={() => { setEditingCoupon(null); setNewCode(''); setNewDiscount(10); setNewDescription(''); }}>Annuler</Button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
