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
          <h1 className="font-serif text-3xl font-bold text-gray-900 mb-8">Conditions Generales de Vente</h1>
          
          <section className="mb-8">
            <h2 className="font-serif text-xl font-bold text-gray-900 mb-3">1. Objet</h2>
            <p className="text-sm text-gray-700 leading-relaxed">
              Les presentes Conditions Generales de Vente (CGV) regissent les relations entre la societe SaTouba Bijouterie, 
              dont le siege est situe a Koumassi, feux de prodomo, juste a la rentree de Sopim, Abidjan, Cote d'Ivoire, 
              et tout client effectuant un achat via le site internet saouba-bijouterie.com.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-xl font-bold text-gray-900 mb-3">2. Produits</h2>
            <p className="text-sm text-gray-700 leading-relaxed">
              Les produits proposes a la vente sont les bijoux en or 18K, diamants, argent et accessoires de luxe 
              presentes sur le site. Chaque produit est decrit avec la plus grande exactitude possible. 
              Les photographies sont aussi fideles que possible mais ne sauraient garantir une similitude parfaite 
              avec le produit reel, notamment en raison des variations naturelles des pierres precieuses.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-xl font-bold text-gray-900 mb-3">3. Prix</h2>
            <p className="text-sm text-gray-700 leading-relaxed">
              Tous les prix sont indiques en FCFA (Franc CFA). SaTouba Bijouterie se reserve le droit de modifier 
              ses prix a tout moment, etant entendu que le prix applicable est celui en vigueur au moment de la validation 
              de la commande par le client.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-xl font-bold text-gray-900 mb-3">4. Commande</h2>
            <p className="text-sm text-gray-700 leading-relaxed">
              La commande est validee lorsque le client a complete toutes les etapes du processus de commande : 
              selection des articles, adresse de livraison et mode de paiement. Un SMS de confirmation est envoye 
              au numero de telephone renseigne par le client.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-xl font-bold text-gray-900 mb-3">5. Paiement</h2>
            <p className="text-sm text-gray-700 leading-relaxed">
              Le paiement s'effectue par les moyens proposes lors de la validation de la commande. 
              Le paiement est exigible a la commande. Aucune donnee de paiement n'est stockee sur nos serveurs.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-xl font-bold text-gray-900 mb-3">6. Livraison</h2>
            <p className="text-sm text-gray-700 leading-relaxed">
              La livraison est assuree par notre coursier securise a Abidjan et ses environs. Le delai est de 24 a 48 heures ouvrees apres confirmation de la commande. Livraison gratuite pour Abidjan et environs ; au-dela, frais calcules lors de la commande.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-xl font-bold text-gray-900 mb-3">7. Droit de retractation</h2>
            <p className="text-sm text-gray-700 leading-relaxed">
              Conformement a la legislation en vigueur, le client dispose d'un delai de 7 jours a compter de la reception 
              de sa commande pour exercer son droit de retractation, sans avoir a justifier de motif. Le produit doit 
              etre retourne dans son emballage d'origine, non porte et en parfait etat.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-xl font-bold text-gray-900 mb-3">8. Garantie</h2>
            <p className="text-sm text-gray-700 leading-relaxed">
              Tous nos bijoux en or 18K beneficient d'une garantie de 2 ans contre les defauts de fabrication. 
              Cette garantie ne couvre pas les dommages resultant d'une utilisation inappropriee, d'un accident 
              ou d'une usure normale.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-xl font-bold text-gray-900 mb-3">9. Contact</h2>
            <p className="text-sm text-gray-700 leading-relaxed">
              Pour toute question, contactez-nous :<br />
              +225 07 47 13 52 01 / +225 05 54 13 07 46<br />
              Koumassi, feux de prodomo, Abidjan<br />
              @Satouba225_bijouterie
            </p>
          </section>
        </div>
      )}

      {type === 'confidentialite' && (
        <div className="prose prose-sm max-w-none">
          <h1 className="font-serif text-3xl font-bold text-gray-900 mb-8">Politique de Confidentialite</h1>
          
          <section className="mb-8">
            <h2 className="font-serif text-xl font-bold text-gray-900 mb-3">1. Donnees collectees</h2>
            <p className="text-sm text-gray-700 leading-relaxed">
              Lors de votre inscription ou de votre commande, nous collectons les informations suivantes : nom, 
              prenom, identifiant, numero de telephone, adresse de livraison, ville. Nous collectons egalement 
              des donnees de navigation (pages visitees, produits consultes) a des fins d'amelioration de nos services.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-xl font-bold text-gray-900 mb-3">2. Utilisation des donnees</h2>
            <p className="text-sm text-gray-700 leading-relaxed">
              Vos donnees personnelles sont utilisees pour : le traitement et la livraison de vos commandes, 
              la gestion de votre compte client, l'envoi de communications relatives a vos commandes, 
              l'amelioration de nos services et de votre experience d'achat, et le respect de nos obligations legales.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-xl font-bold text-gray-900 mb-3">3. Partage des donnees</h2>
            <p className="text-sm text-gray-700 leading-relaxed">
              Vos donnees personnelles ne sont jamais vendues a des tiers. Elles peuvent etre partagees avec : 
              nos prestataires de livraison pour l'acheminement de vos commandes, et les autorites competentes 
              en cas d'obligation legale.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-xl font-bold text-gray-900 mb-3">4. Securite</h2>
            <p className="text-sm text-gray-700 leading-relaxed">
              Nous mettons en oeuvre les mesures techniques et organisationnellesappropriees pour proteger vos donnees 
              personnelles contre tout acces non autorise, alteration, divulgation ou destruction. Les mots de passe 
              sont hashes avec bcrypt.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-xl font-bold text-gray-900 mb-3">5. Vos droits</h2>
            <p className="text-sm text-gray-700 leading-relaxed">
              Conformement a la legislation en vigueur, vous disposez d'un droit d'acces, de rectification et de 
              suppression de vos donnees personnelles. Pour exercer ces droits, contactez-nous.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-xl font-bold text-gray-900 mb-3">6. Cookies</h2>
            <p className="text-sm text-gray-700 leading-relaxed">
              Notre site utilise des cookies essentiels au bon fonctionnement de votre session (authentification, panier). 
              Ces cookies sont strictement necessaires et ne necessitent pas votre consentement.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-xl font-bold text-gray-900 mb-3">7. Contact</h2>
            <p className="text-sm text-gray-700 leading-relaxed">
              Pour toute question relative a la protection de vos donnees :<br />
              +225 07 47 13 52 01
            </p>
          </section>
        </div>
      )}
    </div>
  );
}
