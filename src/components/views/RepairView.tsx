import React, { useState } from 'react';
import { Wrench, Send, CheckCircle2 } from 'lucide-react';
import { createRepairRequest } from '../../lib/api/repairs';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

export function RepairView() {
  const [jewelryType, setJewelryType] = useState('');
  const [problemType, setProblemType] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await createRepairRequest({ jewelryType, problemType, description, phone });
      setSuccess(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0B5D1E]/10 text-[#0B5D1E] text-xs font-semibold">
          <Wrench size={14} className="text-[#D9A441]" />
          <span>Service Après-Vente & Restauration SaTouba</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-gray-900">Redonnez vie à vos bijoux</h1>
        <p className="text-sm text-gray-600 max-w-xl mx-auto leading-relaxed">
          Nos maîtres bijoutiers prennent soin de vos pièces précieuses : nettoyage professionnel, mise à taille, sertissage et réparation de casse.
        </p>
      </div>

      {success ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 p-8 space-y-6 shadow-sm">
          <div className="w-20 h-20 rounded-full bg-[#EAF7ED] text-[#0B5D1E] flex items-center justify-center mx-auto">
            <CheckCircle2 size={40} />
          </div>
          <h3 className="font-serif text-2xl font-bold text-gray-900">Demande de réparation enregistrée</h3>
          <p className="text-sm text-gray-600 max-w-md mx-auto leading-relaxed">
            Nous avons bien pris en compte votre demande. Déposez votre bijou à notre atelier ou demandez un enlèvement sécurisé par coursier.
          </p>
          <Button onClick={() => setSuccess(false)}>Nouvelle demande</Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-10 rounded-3xl border border-gray-100 shadow-sm space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Type de bijou</label>
              <select
                value={jewelryType}
                onChange={(e) => setJewelryType(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white p-3 text-sm focus:outline-none focus:border-[#0B5D1E]"
              >
                <option value="Bague">Bague / Alliance</option>
                <option value="Collier">Collier / Pendentif</option>
                <option value="Bracelet">Bracelet / Jonc</option>
                <option value="Montre">Montre de prestige</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Type d'intervention</label>
              <select
                value={problemType}
                onChange={(e) => setProblemType(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white p-3 text-sm focus:outline-none focus:border-[#0B5D1E]"
              >
                <option value="Mise à taille">Mise à taille (Agrandir / Réduire)</option>
                <option value="Nettoyage & Polissage">Nettoyage professionnel & Polissage miroir</option>
                <option value="Réparation casse">Soudure / Réparation de casse</option>
                <option value="Sertissage pierre">Sertissage / Remplacement de pierre</option>
              </select>
            </div>
          </div>

          <Input
            label="Téléphone (WhatsApp)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Description du problème</label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez l'état du bijou, la taille souhaitée ou le problème rencontré..."
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
            Soumettre la demande de SAV
          </Button>
        </form>
      )}

    </div>
  );
}
