import React, { useState, useMemo } from 'react';
import { Sparkles, Send, CheckCircle2, ShieldCheck, Calculator, Gem } from 'lucide-react';
import { createCustomRequest } from '../../lib/api/custom';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';

export function CustomView() {
  const { toast } = useToast();
  const [jewelryType, setJewelryType] = useState('');
  const [material, setMaterial] = useState('');
  const [weight, setWeight] = useState(0);
  const [stone, setStone] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Prix fixes (FCFA)
  const PRICES: Record<string, number> = {
    'Or Jaune 18K': 35000,
    'Or Blanc 18K': 38000,
    'Or Rose 18K': 37000,
    'Argent Massif': 2500,
  };
  const STONE_COST: Record<string, number> = {
    'Diamant Satouba Bijouterie 255': 500000,
    'Rubis / Saphir': 300000,
    'Émeraude': 250000,
    'Zirconium éclat': 50000,
    'Aucune (Or pur)': 0,
  };
  const LABOR_FEE = 5000;

  const estimatedPrice = useMemo(() => {
    const baseRate = PRICES[material] || 35000;
    const stoneCost = STONE_COST[stone] || 0;
    const total = (weight * baseRate) + stoneCost + LABOR_FEE;
    return Math.round(total / 5000) * 5000;
  }, [material, weight, stone]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const budgetStr = `${estimatedPrice.toLocaleString()} FCFA`;
    try {
      await createCustomRequest({
        jewelryType,
        material: `${material} (${weight}g - Pierre: ${stone})`,
        description,
        budget: budgetStr,
        phone
      });
      setSuccess(true);
    } catch (err: any) {
      toast(err.message || 'Erreur lors de la soumission', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0B5D1E]/10 text-[#0B5D1E] text-xs font-semibold">
          <Sparkles size={14} className="text-[#D9A441]" />
          <span>Atelier de Haute Joaillerie Satouba Bijouterie 255</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-gray-900">Simulateur & Création Sur-Mesure</h1>
        <p className="text-sm text-gray-600 max-w-xl mx-auto leading-relaxed">
          Estimez instantanément le tarif de votre bijou sur-mesure grâce à notre simulateur interactif et confiez sa réalisation à nos maîtres artisans à Abidjan — Coursier Satouba Bijouterie 255 (Abidjan & environs).
        </p>
      </div>

      {success ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 p-8 space-y-6 shadow-sm">
          <div className="w-20 h-20 rounded-full bg-[#EAF7ED] text-[#0B5D1E] flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 size={40} />
          </div>
          <h3 className="font-serif text-2xl font-bold text-gray-900">Projet sur-mesure transmis avec succès</h3>
          <p className="text-sm text-gray-600 max-w-md mx-auto leading-relaxed">
            Votre estimation de <strong className="text-[#D9A441]">{estimatedPrice.toLocaleString()} FCFA</strong> a été enregistrée. Notre maître joaillier vous contactera sur WhatsApp sous 24h.
          </p>
          <Button onClick={() => setSuccess(false)}>Nouvelle simulation</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Form */}
          <form onSubmit={handleSubmit} className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
            <h3 className="font-serif text-lg font-bold text-gray-900 pb-3 border-b border-gray-100 flex items-center gap-2">
              <Calculator size={18} className="text-[#0B5D1E]" />
              Configuration de votre bijou
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Type de bijou</label>
                <select
                  value={jewelryType}
                  onChange={(e) => setJewelryType(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white p-3 text-sm focus:outline-none focus:border-[#0B5D1E]"
                >
                  <option value="Bague de Fiançailles">Bague de Fiançailles / Alliance</option>
                  <option value="Collier Pendentif">Collier / Pendentif</option>
                  <option value="Bracelet Jonc">Bracelet / Jonc</option>
                  <option value="Boucles d'oreilles">Boucles d'oreilles</option>
                  <option value="Parure complète">Parure complète mariage</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Matière précieuse</label>
                <select
                  value={material}
                  onChange={(e) => setMaterial(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white p-3 text-sm focus:outline-none focus:border-[#0B5D1E]"
                >
                  <option value="Or Jaune 18K">Or Jaune 18K Pur</option>
                  <option value="Or Blanc 18K">Or Blanc 18K</option>
                  <option value="Or Rose 18K">Or Rose 18K</option>
                  <option value="Argent Massif">Argent Massif 925</option>
                </select>
              </div>
            </div>

            {/* Weight Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Poids estimé en métal</label>
                <span className="font-bold text-sm text-[#0B5D1E] bg-[#EAF7ED] px-3 py-1 rounded-full">{weight} grammes</span>
              </div>
              <input
                type="range"
                min="3"
                max="40"
                step="1"
                value={weight}
                onChange={(e) => setWeight(Number(e.target.value))}
                className="w-full accent-[#0B5D1E] cursor-pointer"
              />
            </div>

            {/* Stone Option */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Pierre précieuse / Ornement</label>
              <select
                value={stone}
                onChange={(e) => setStone(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white p-3 text-sm focus:outline-none focus:border-[#0B5D1E]"
              >
                <option value="Diamant SaTouba">Diamant Certifié Satouba Bijouterie 255</option>
                <option value="Rubis / Saphir">Rubis / Saphir Naturel</option>
                <option value="Émeraude">Émeraude Précieuse</option>
                <option value="Zirconium éclat">Zirconium Haute Brillance</option>
                <option value="Aucune (Or pur)">Aucune pierre (Métal pur)</option>
              </select>
            </div>

            <Input
              label="Téléphone (WhatsApp)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Instructions ou détails spécifiques</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Gravure intérieure 'A & M', finition polie miroir..."
                className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:outline-none focus:border-[#0B5D1E]"
                required
              />
            </div>

            <Button
              type="submit"
              size="lg"
              isLoading={isSubmitting}
              icon={<Send size={18} />}
              className="w-full shadow-lg"
            >
              Soumettre ce projet à l'atelier
            </Button>
          </form>

          {/* Real-Time Price Estimation Card */}
          <div className="lg:col-span-5 bg-gradient-to-br from-[#0B5D1E] to-[#064A15] p-6 sm:p-8 rounded-3xl text-white shadow-xl space-y-6 sticky top-8">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <span className="text-xs uppercase tracking-widest text-emerald-200 font-semibold">Simulation en direct</span>
              <Gem size={22} className="text-[#D9A441]" />
            </div>

            <div className="space-y-4 text-sm">
              <div className="flex justify-between text-emerald-100">
                <span>Type :</span>
                <span className="font-semibold text-white">{jewelryType}</span>
              </div>
              <div className="flex justify-between text-emerald-100">
                <span>Matière :</span>
                <span className="font-semibold text-white">{material}</span>
              </div>
              <div className="flex justify-between text-emerald-100">
                <span>Poids :</span>
                <span className="font-semibold text-white">{weight}g</span>
              </div>
              <div className="flex justify-between text-emerald-100">
                <span>Pierre :</span>
                <span className="font-semibold text-white">{stone}</span>
              </div>
            </div>

            <div className="pt-6 border-t border-white/10 space-y-2">
              <span className="text-xs text-emerald-200 uppercase tracking-wider block">Estimation tarifaire atelier</span>
              <div className="font-serif text-3xl sm:text-4xl font-bold text-[#D9A441]">
                {estimatedPrice.toLocaleString()} <span className="text-lg font-sans text-white">FCFA</span>
              </div>
              <p className="text-[11px] text-emerald-200 leading-relaxed pt-2">
                *Tarif indicatif incluant l'or certifié, les pierres et la main-d'œuvre de nos maîtres artisans à Abidjan. Coursier SaTouba (Abidjan & environs) Gratuit — Remise en main propre sous 24-48h avec certificat d’authenticité.
              </p>
            </div>

            <div className="p-4 bg-white/10 rounded-2xl flex items-center gap-3">
              <ShieldCheck size={24} className="text-[#D9A441] shrink-0" />
              <p className="text-xs text-emerald-100 leading-relaxed">
                Certificat d'authenticité et poinçon officiel Satouba Bijouterie 255 inclus pour chaque création sur-mesure.
              </p>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
