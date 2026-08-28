import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface LegalViewProps {
  type: 'cgv' | 'confidentialite';
}

export function LegalView({ type }: LegalViewProps) {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => window.history.back()}
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-[#0B5D1E] transition-colors mb-8"
      >
        <ArrowLeft size={16} />
        Retour
      </button>

      {type === 'cgv' && (
        <div className="prose prose-sm max-w-none">
          <h1 className="font-serif text-3xl font-bold text-gray-900 mb-8">Conditions Générales de Vente</h1>
          
          <section className="mb-8">
            <h2 className="font-serif text-xl font-bold text-gray-900 mb-3">1. Objet</h2>
            <p className="text-sm text-gray-700 leading-relaxed">
              Les présentes Conditions Générales de Vente (CGV) régissent les relations entre la société SaTouba Bijouterie, 
              dont le siège est situé à Koumassi, feux de prodomo, juste à la rentrée de Sopim, Abidjan, Côte d'Ivoire, 
              et tout client effectuant un achat via le site internet saouba-bijouterie.com.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-xl font-bold text-gray-900 mb-3">2. Produits</h2>
            <p className="text-sm text-gray-700 leading-relaxed">
              Les produits proposés à la vente sont les bijoux en or 18K, diamants, argent et accessoires de luxe 
              présentés sur le site. Chaque produit est décrit avec la plus grande exactitude possible. 
              Les photographies sont aussi fidèles que possible mais ne sauraient garantir une similitude parfaite 
              avec le produit réel, notamment en raison des variations naturelles des pierres précieuses.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-xl font-bold text-gray-900 mb-3">3. Prix</h2>
            <p className="text-sm text-gray-700 leading-relaxed">
              Tous les prix sont indiqués en FCFA (Franc CFA). SaTouba Bijouterie se réserve le droit de modifier 
              ses prix à tout moment, étant entendu que le prix applicable est celui en vigueur au moment de la validation 
              de la commande par le client.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-xl font-bold text-gray-900 mb-3">4. Commande</h2>
            <p className="text-sm text-gray-700 leading-relaxed">
              La commande est validée lorsque le client a complété toutes les étapes du processus de checkout : 
              adresse de livraison, mode de livraison et mode de paiement. Un email de confirmation est envoyé 
              à l'adresse renseignée par le client.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-xl font-bold text-gray-900 mb-3">5. Paiement — Wave Business exclusif</h2>
            <p className="text-sm text-gray-700 leading-relaxed">
              Le paiement s'effectue exclusivement via <strong>Wave Business</strong> par lien de paiement. Le montant est calculé et <strong>verrouillé côté serveur</strong> à partir des prix en base ; il n’est <strong>pas modifiable</strong> par le client sur l’application Wave. Le client peut librement ajouter 1 ou plusieurs articles à son panier ; le total est recalculé serveur et seul le montant exact est présenté sur Wave. Le paiement est exigible à la commande et crypté ; aucune donnée de paiement n’est stockée sur nos serveurs.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-xl font-bold text-gray-900 mb-3">6. Livraison</h2>
            <p className="text-sm text-gray-700 leading-relaxed">
              La livraison est assurée par notre coursier sécurisé à Abidjan et ses environs. Le délai de livraison 
              est de 24 à 48 heures ouvrées après confirmation du paiement. Les frais de livraison sont de 5 000 FCFA, 
              offerts pour toute commande supérieure à 200 000 FCFA.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-xl font-bold text-gray-900 mb-3">7. Droit de rétractation</h2>
            <p className="text-sm text-gray-700 leading-relaxed">
              Conformément à la législation en vigueur, le client dispose d'un délai de 7 jours à compter de la réception 
              de sa commande pour exercer son droit de rétractation, sans avoir à justifier de motif. Le produit doit 
              être retourné dans son emballage d'origine, non porté et en parfait état.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-xl font-bold text-gray-900 mb-3">8. Garantie</h2>
            <p className="text-sm text-gray-700 leading-relaxed">
              Tous nos bijoux en or 18K bénéficient d'une garantie de 2 ans contre les défauts de fabrication. 
              Cette garantie ne couvre pas les dommages résultant d'une utilisation inappropriée, d'un accident 
              ou d'une usure normale.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-xl font-bold text-gray-900 mb-3">9. Contact</h2>
            <p className="text-sm text-gray-700 leading-relaxed">
              Pour toute question, contactez-nous :<br />
              📞 +221 05 54 13 07 46 / +221 07 47 13 52 01<br />
              📧 contact@satouba-bijouterie.sn<br />
              📍 Koumassi, feux de prodomo, Abidjan<br />
              📸 @Satouba225_bijouterie
            </p>
          </section>
        </div>
      )}

      {type === 'confidentialite' && (
        <div className="prose prose-sm max-w-none">
          <h1 className="font-serif text-3xl font-bold text-gray-900 mb-8">Politique de Confidentialité</h1>
          
          <section className="mb-8">
            <h2 className="font-serif text-xl font-bold text-gray-900 mb-3">1. Données collectées</h2>
            <p className="text-sm text-gray-700 leading-relaxed">
              Lors de votre inscription ou de votre commande, nous collectons les informations suivantes : nom, 
              prénom, adresse email, numéro de téléphone, adresse de livraison, ville. Nous collectons également 
              des données de navigation (pages visitées, produits consultés) à des fins d'amélioration de nos services.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-xl font-bold text-gray-900 mb-3">2. Utilisation des données</h2>
            <p className="text-sm text-gray-700 leading-relaxed">
              Vos données personnelles sont utilisées pour : le traitement et la livraison de vos commandes, 
              la gestion de votre compte client, l'envoi de communications relatives à vos commandes, 
              l'amélioration de nos services et de votre expérience d'achat, et le respect de nos obligations légales.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-xl font-bold text-gray-900 mb-3">3. Partage des données</h2>
            <p className="text-sm text-gray-700 leading-relaxed">
              Vos données personnelles ne sont jamais vendues à des tiers. Elles peuvent être partagées avec : 
              nos prestataires de livraison pour l'acheminement de vos commandes, et les autorités compétentes 
              en cas d'obligation légale.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-xl font-bold text-gray-900 mb-3">4. Sécurité</h2>
            <p className="text-sm text-gray-700 leading-relaxed">
              Nous mettons en oeuvre les mesures techniques et organisationnelles appropriées pour protéger vos données 
              personnelles contre tout accès non autorisé, alteration, divulgation ou destruction. Les mots de passe 
              sont hashés avec bcrypt.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-xl font-bold text-gray-900 mb-3">5. Vos droits</h2>
            <p className="text-sm text-gray-700 leading-relaxed">
              Conformément à la législation en vigueur, vous disposez d'un droit d'accès, de rectification et de 
              suppression de vos données personnelles. Pour exercer ces droits, contactez-nous à 
              contact@satouba-bijouterie.sn.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-xl font-bold text-gray-900 mb-3">6. Cookies</h2>
            <p className="text-sm text-gray-700 leading-relaxed">
              Notre site utilise des cookies essentiels au bon fonctionnement de votre session (authentification, panier). 
              Ces cookies sont strictement nécessaires et ne nécessitent pas votre consentement.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-xl font-bold text-gray-900 mb-3">7. Contact</h2>
            <p className="text-sm text-gray-700 leading-relaxed">
              Pour toute question relative à la protection de vos données :<br />
              📧 contact@satouba-bijouterie.sn<br />
              📞 +221 05 54 13 07 46
            </p>
          </section>
        </div>
      )}
    </div>
  );
}
