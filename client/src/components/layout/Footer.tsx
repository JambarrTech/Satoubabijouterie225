import { useState, useEffect } from 'react';
import { Phone, Mail, MapPin, ShieldCheck, Truck, Clock, Instagram, MessageSquare } from 'lucide-react';
import { fetchStoreSettings, StoreSettings } from '../../lib/api/settings';

interface FooterProps {
  onNavigate?: (tab: string) => void;
}

export function Footer({ onNavigate }: FooterProps) {
  const [settings, setSettings] = useState<StoreSettings | null>(null);

  useEffect(() => {
    fetchStoreSettings().then(setSettings).catch(() => {});
  }, []);

  const handleNav = (tab: string) => {
    if (onNavigate) onNavigate(tab);
  };

  const handleWhatsApp = () => {
    if (settings?.whatsapp) {
      window.open(`https://wa.me/${settings.whatsapp}?text=Bonjour%20${settings?.brand_name?.replace(/\s/g, '%20')},%20je%20souhaite%20des%20renseignements.`, '_blank');
    }
  };

  return (
    <footer className="bg-[#064A15] text-white pt-16 pb-24 md:pb-16 border-t border-[#0B5D1E]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Bandeau confiance */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-12 mb-12 border-b border-emerald-900/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-900/80 flex items-center justify-center text-[#D9A441]">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h4 className="font-serif font-semibold text-sm">Authenticité & Certification</h4>
              <p className="text-xs text-emerald-200/80">Or 18K et pierres précieuses certifiées</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-900/80 flex items-center justify-center text-[#D9A441]">
              <Truck size={24} />
            </div>
            <div>
              <h4 className="font-serif font-semibold text-sm">Coursier SaTouba (Abidjan & environs)</h4>
              <p className="text-xs text-emerald-200/80">Gratuit — Remise en main propre sous 24-48h avec certificat d’authenticité.</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-900/80 flex items-center justify-center text-[#D9A441]">
              <Clock size={24} />
            </div>
            <div>
              <h4 className="font-serif font-semibold text-sm">Sur-mesure & SAV</h4>
              <p className="text-xs text-emerald-200/80">Création personnalisée et atelier de réparation</p>
            </div>
          </div>
        </div>

        {/* Contenu principal */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          
          {/* Colonne Marque */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-white overflow-hidden border border-[#D9A441] p-0.5 flex items-center justify-center">
                <img src="/logo.jpg" alt={settings?.brand_name || 'SaTouba'} className="w-full h-full object-contain" />
              </div>
              <div>
                <span className="font-serif text-lg font-bold text-white block">{settings?.brand_name || 'SaTouba Bijouterie'}</span>
                {settings?.tagline && <span className="text-xs text-[#D9A441] italic">{settings.tagline}</span>}
              </div>
            </div>
            <p className="text-xs text-emerald-200/80 leading-relaxed mb-4">
              {settings?.description || 'Vente de bijoux en or 18K, diamants, argent & accessoires de luxe'}
            </p>
          </div>

          {/* Colonne Collections */}
          <div>
            <h5 className="font-serif font-semibold text-sm mb-4 text-[#D9A441] uppercase tracking-wider">Collections</h5>
            <ul className="space-y-2.5 text-xs text-emerald-200/80">
              <li><button onClick={() => handleNav('catalogue')} className="hover:text-white transition-colors text-left">Bagues d'exception</button></li>
              <li><button onClick={() => handleNav('catalogue')} className="hover:text-white transition-colors text-left">Colliers & Pendentifs</button></li>
              <li><button onClick={() => handleNav('catalogue')} className="hover:text-white transition-colors text-left">Bracelets et Joncs</button></li>
              <li><button onClick={() => handleNav('catalogue')} className="hover:text-white transition-colors text-left">Boucles d'oreilles</button></li>
              <li><button onClick={() => handleNav('catalogue')} className="hover:text-white transition-colors text-left">Alliances de mariage</button></li>
            </ul>
          </div>

          {/* Colonne Services */}
          <div>
            <h5 className="font-serif font-semibold text-sm mb-4 text-[#D9A441] uppercase tracking-wider">Services</h5>
            <ul className="space-y-2.5 text-xs text-emerald-200/80">
              <li><button onClick={() => handleNav('sur-mesure')} className="hover:text-white transition-colors text-left">Création sur-mesure</button></li>
              <li><button onClick={() => handleNav('reparation')} className="hover:text-white transition-colors text-left">Réparation & SAV</button></li>
              <li><button onClick={() => handleNav('commandes')} className="hover:text-white transition-colors text-left">Suivi de commande</button></li>
              <li><button onClick={() => handleNav('chat')} className="hover:text-white transition-colors text-left">Contactez-nous</button></li>
            </ul>
          </div>

          {/* Colonne Contact */}
          <div>
            <h5 className="font-serif font-semibold text-sm mb-4 text-[#D9A441] uppercase tracking-wider">Contact & Atelier</h5>
            <ul className="space-y-3 text-xs text-emerald-200/80">
              <li className="flex items-start gap-2.5">
                <MapPin size={16} className="text-[#D9A441] shrink-0 mt-0.5" />
                <span>{settings?.address || 'Koumassi, feux de prodomo, juste à la rentrée de Sopim, Abidjan — Coursier SaTouba (Abidjan & environs)'}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone size={16} className="text-[#D9A441] shrink-0" />
                <div className="flex flex-col">
                  <span>{settings?.phone_main || '+225 07 47 13 52 01'}</span>
                  {settings?.phone_secondary && <span>{settings.phone_secondary}</span>}
                  {settings?.phone_tertiary && <span>{settings.phone_tertiary}</span>}
                </div>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail size={16} className="text-[#D9A441] shrink-0" />
                <span>{settings?.email || 'contact@satouba-bijouterie.ci'}</span>
              </li>
              {settings?.instagram && (
                <li className="flex items-center gap-2.5">
                  <Instagram size={16} className="text-[#D9A441] shrink-0" />
                  <span>@{settings.instagram}</span>
                </li>
              )}
              {settings?.whatsapp && (
                <li>
                  <button
                    onClick={handleWhatsApp}
                    className="flex items-center gap-2.5 hover:text-[#25D366] transition-colors"
                  >
                    <MessageSquare size={16} className="text-[#D9A441] shrink-0" />
                    <span>WhatsApp direct</span>
                  </button>
                </li>
              )}
            </ul>
            {settings?.opening_hours && (
              <div className="mt-4 p-3 bg-emerald-900/50 rounded-xl">
                <p className="text-[10px] text-emerald-300/60 uppercase tracking-wider mb-1">Horaires</p>
                <p className="text-xs text-emerald-200/80">{settings.opening_hours}</p>
              </div>
            )}
          </div>
        </div>

        {/* Bas de page */}
        <div className="pt-8 border-t border-emerald-900/50 flex flex-col sm:flex-row items-center justify-between text-xs text-emerald-300/60">
          <p>&copy; 2026 {settings?.brand_name || 'SaTouba Bijouterie'}. Tous droits réservés.</p>
          <div className="flex gap-6 mt-4 sm:mt-0">
            <button onClick={() => handleNav('cgv')} className="hover:text-white cursor-pointer transition-colors">Conditions Générales de Vente</button>
            <button onClick={() => handleNav('confidentialite')} className="hover:text-white cursor-pointer transition-colors">Politique de confidentialité</button>
          </div>
        </div>

      </div>
    </footer>
  );
}
