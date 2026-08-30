import { useState, useEffect } from 'react';
import { MessageSquare, Phone, MapPin, Sparkles } from 'lucide-react';
import { Button } from '../ui/Button';
import { fetchStoreSettings, StoreSettings } from '../../lib/api/settings';

export function ChatView() {
  const [settings, setSettings] = useState<StoreSettings | null>(null);

  useEffect(() => {
    fetchStoreSettings().then(setSettings).catch(console.error);
  }, []);

  const handleWhatsApp = () => {
    window.open(`https://wa.me/${settings?.whatsapp}?text=Bonjour%20${settings?.brand_name?.replace(/\s/g, '%20')},%20je%20souhaite%20des%20renseignements.`, '_blank');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0B5D1E]/10 text-[#0B5D1E] text-xs font-semibold">
          <Sparkles size={14} className="text-[#D9A441]" />
          <span>Service Client & Conciergerie SaTouba</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-gray-900">Contactez nos conseillers</h1>
        <p className="text-sm text-gray-600 max-w-xl mx-auto leading-relaxed">
          Une question sur nos collections d'or, une commande en cours ou un projet sur-mesure ? Notre équipe est à votre écoute.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* WhatsApp direct card */}
        <div className="bg-gradient-to-br from-[#EAF7ED] to-white p-8 rounded-3xl border-2 border-[#0B5D1E]/20 shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-[#0B5D1E] text-white flex items-center justify-center shadow-md">
              <MessageSquare size={28} />
            </div>
            <h3 className="font-serif text-2xl font-bold text-gray-900">Discussion Instantanée WhatsApp</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Le moyen le plus rapide d'obtenir des photos, des conseils personnalisés ou de valider une commande avec nos conseillers à Abidjan — Coursier SaTouba (Abidjan & environs).
            </p>
          </div>

          <Button
            size="lg"
            onClick={handleWhatsApp}
            icon={<MessageSquare size={18} className="text-[#25D366]" />}
            className="w-full bg-[#0B5D1E] hover:bg-[#064A15] text-white"
          >
            Ouvrir WhatsApp (+{settings?.whatsapp?.replace(/^221/, '221 ')})
          </Button>
        </div>

        {/* Info & Atelier card */}
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
          <h3 className="font-serif text-xl font-bold text-gray-900 pb-4 border-b border-gray-100">
            Coordonnées de l'Atelier
          </h3>

          <ul className="space-y-4 text-sm text-gray-700">
            <li className="flex items-start gap-3">
              <MapPin size={20} className="text-[#0B5D1E] shrink-0 mt-0.5" />
              <span>{settings?.address}</span>
            </li>
            <li className="flex items-center gap-3">
              <Phone size={20} className="text-[#0B5D1E] shrink-0" />
              <span>{settings?.phone_main} / {settings?.phone_secondary}</span>
            </li>
          </ul>

          <div className="p-4 bg-gray-50 rounded-2xl text-xs text-gray-500 leading-relaxed">
            <strong className="text-gray-800 block mb-1">Horaires d'ouverture :</strong>
            {settings?.opening_hours}
          </div>
        </div>

      </div>

    </div>
  );
}
