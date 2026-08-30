import axios from 'axios';
import logger from './logger';

const AT_USERNAME = process.env.AFRICASTALKING_USERNAME || 'sandbox';
const AT_API_KEY = process.env.AFRICASTALKING_API_KEY || '';
const AT_SENDER_ID = process.env.AFRICASTALKING_SENDER_ID || 'SaTouba';
const AT_BASE_URL = AT_USERNAME === 'sandbox'
  ? 'https://api.sandbox.africastalking.com'
  : 'https://api.africastalking.com';
const COUNTRY_CODE = process.env.COUNTRY_CODE || '225';
const CONTACT_PHONE = process.env.CONTACT_PHONE || '+225 07 47 13 52 01';

interface SMSOptions {
  to: string;
  message: string;
  senderId?: string;
}

interface SMSResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  cost?: string;
  recipients?: Array<{
    number: string;
    status: string;
    statusCode: number;
    messageId: string;
    cost: string;
  }>;
}

function formatPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');

  // Remove leading 0 (local format)
  if (cleaned.startsWith('0')) {
    cleaned = COUNTRY_CODE + cleaned.substring(1);
  }

  // Add country code if missing
  if (!cleaned.startsWith(COUNTRY_CODE)) {
    cleaned = COUNTRY_CODE + cleaned;
  }

  // Validate length (Cote d'Ivoire: 10 digits after +225)
  if (cleaned.length < 10 || cleaned.length > 15) {
    logger.warn({ phone, cleaned }, 'Invalid phone number length');
  }

  return '+' + cleaned;
}

export async function sendSMS(options: SMSOptions): Promise<SMSResponse> {
  if (!AT_API_KEY) {
    logger.warn('Africa\'s Talking API key not configured, skipping SMS');
    return { success: false, error: 'SMS service not configured' };
  }

  const phone = formatPhoneNumber(options.to);

  // Log SMS attempt (without full message for privacy)
  logger.info({
    to: phone,
    messageLength: options.message.length,
    senderId: options.senderId || AT_SENDER_ID,
    environment: AT_USERNAME,
  }, 'SMS send attempt');

  try {
    const response = await axios.post(
      `${AT_BASE_URL}/version1/messaging`,
      new URLSearchParams({
        username: AT_USERNAME,
        to: phone,
        message: options.message,
        from: options.senderId || AT_SENDER_ID,
      }),
      {
        headers: {
          'apiKey': AT_API_KEY,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        timeout: 10000, // 10s timeout
      }
    );

    const data = response.data;
    const recipients = data.SMSMessageData?.Recipients || [];
    const recipient = recipients[0];

    if (recipient && recipient.status === 'Success') {
      logger.info({
        to: phone,
        messageId: recipient.messageId,
        cost: recipient.cost,
      }, 'SMS sent successfully');
      return {
        success: true,
        messageId: recipient.messageId,
        cost: recipient.cost,
        recipients,
      };
    }

    // Partial success: some recipients may have failed
    const failedRecipients = recipients.filter((r: any) => r.status !== 'Success');
    if (failedRecipients.length > 0) {
      logger.warn({
        to: phone,
        failedStatuses: failedRecipients.map((r: any) => r.status),
      }, 'SMS delivery failed for some recipients');
    }

    return {
      success: false,
      error: recipient?.status || data.SMSMessageData?.Message || 'SMS sending failed',
      recipients,
    };
  } catch (error: any) {
    const errData = error.response?.data;
    logger.error({
      to: phone,
      error: errData?.errorMessage || error.message,
      statusCode: error.response?.status,
    }, 'SMS API error');
    return {
      success: false,
      error: errData?.errorMessage || error.message,
    };
  }
}

export async function sendBulkSMS(phones: string[], message: string, senderId?: string): Promise<SMSResponse> {
  if (!AT_API_KEY) {
    return { success: false, error: 'SMS service not configured' };
  }

  if (phones.length === 0) {
    return { success: false, error: 'No recipients' };
  }

  const formattedPhones = phones.map(formatPhoneNumber).join(',');

  logger.info({
    recipientCount: phones.length,
    messageLength: message.length,
  }, 'Bulk SMS send attempt');

  try {
    const response = await axios.post(
      `${AT_BASE_URL}/version1/messaging`,
      new URLSearchParams({
        username: AT_USERNAME,
        to: formattedPhones,
        message,
        from: senderId || AT_SENDER_ID,
      }),
      {
        headers: {
          'apiKey': AT_API_KEY,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        timeout: 15000,
      }
    );

    const recipients = response.data.SMSMessageData?.Recipients || [];
    const successCount = recipients.filter((r: any) => r.status === 'Success').length;
    const failedCount = recipients.length - successCount;

    logger.info({
      successCount,
      failedCount,
      total: recipients.length,
    }, 'Bulk SMS completed');

    return {
      success: successCount > 0,
      recipients,
    };
  } catch (error: any) {
    logger.error({
      error: error.response?.data?.errorMessage || error.message,
    }, 'Bulk SMS API error');
    return {
      success: false,
      error: error.response?.data?.errorMessage || error.message,
    };
  }
}

// ====================================================
// COMMANDES — Templates SMS
// ====================================================

export async function sendOrderConfirmationSMS(phone: string, orderNumber: string, total: number): Promise<SMSResponse> {
  const message = [
    `SaTouba`,
    `Bonjour, votre commande ${orderNumber} a bien ete confirmee.`,
    `Montant: ${total.toLocaleString()} FCFA.`,
    `Nos artisans artisan commence la fabrication de votre bijou.`,
    `Vous recevrez un SMS a chaque etape (fabrication, expedition, livraison).`,
    `Questions? Appelez-nous: ${CONTACT_PHONE}`,
  ].join(' ');
  return sendSMS({ to: phone, message });
}

export async function sendPreparingSMS(phone: string, orderNumber: string): Promise<SMSResponse> {
  const message = [
    `SaTouba`,
    `Votre commande ${orderNumber} est en cours de fabrication par nos artisans.`,
    `Delai estime: 3 a 7 jours ouvrables selon le type de bijou.`,
    `Nous vous notifierons des que votre commande sera expediee.`,
    `Suivi: ${CONTACT_PHONE}`,
  ].join(' ');
  return sendSMS({ to: phone, message });
}

export async function sendShippingSMS(phone: string, orderNumber: string, trackingUrl?: string): Promise<SMSResponse> {
  const tracking = trackingUrl ? `\nSuivi colis: ${trackingUrl}` : '';
  const message = [
    `SaTouba`,
    `Bonne nouvelle! Votre commande ${orderNumber} est en route vers vous.`,
    `Livraison prevue sous 24 a 48h a Abidjan, 48 a 72h en province.${tracking}`,
    `En cas d'absence, le coursier vous contactera.`,
    `Questions? ${CONTACT_PHONE}`,
  ].join(' ');
  return sendSMS({ to: phone, message });
}

export async function sendDeliverySMS(phone: string, orderNumber: string): Promise<SMSResponse> {
  const message = [
    `SaTouba`,
    `Votre commande ${orderNumber} a ete livree avec succes!`,
    `Merci pour votre confiance. Votre satisfaction est notre priorite.`,
    `Nous vous remercions de prendre un moment pour nous laisser un avis sur l'application.`,
    `Pour toute question sur votre bijou: ${CONTACT_PHONE}`,
  ].join(' ');
  return sendSMS({ to: phone, message });
}

export async function sendCancelledSMS(phone: string, orderNumber: string, reason?: string): Promise<SMSResponse> {
  const reasonPart = reason ? `\nMotif: ${reason}.` : '';
  const message = [
    `SaTouba`,
    `Votre commande ${orderNumber} a ete annulee.${reasonPart}`,
    `Si un paiement a ete effectue, le remboursement sera traite sous 3 a 5 jours ouvrables.`,
    `Pour plus d'informations, contactez-nous: ${CONTACT_PHONE}`,
  ].join(' ');
  return sendSMS({ to: phone, message });
}

export async function sendNewOrderSMS(phone: string, orderNumber: string, customerName: string, total: number): Promise<SMSResponse> {
  const message = [
    `SaTouba - Nouvelle Commande`,
    `Commande ${orderNumber} de ${customerName}.`,
    `Montant: ${total.toLocaleString()} FCFA.`,
    `Connectez-vous au tableau de bord pour gerer cette commande.`,
  ].join(' ');
  return sendSMS({ to: phone, message });
}

// ====================================================
// DEMANDE SUR-MESURE — Templates SMS
// ====================================================

export async function sendCustomRequestSMS(phone: string, requestId: string): Promise<SMSResponse> {
  const message = [
    `SaTouba - Sur-mesure`,
    `Votre demande de creation sur-mesure ${requestId} a bien ete recue.`,
    `Notre equipe va etudier votre projet et vous contacter sous 24h pour:`,
    `- Discuter de vos preferences (materiaux, style, budget)`,
    `- Vous proposer un devis detaille`,
    `- Organiser un rendez-vous en boutique si besoin`,
    `Contact direct: ${CONTACT_PHONE}`,
  ].join(' ');
  return sendSMS({ to: phone, message });
}

export async function sendCustomStatusSMS(phone: string, requestId: string, status: string): Promise<SMSResponse> {
  const statusMessages: Record<string, string> = {
    IN_PROGRESS: [
      `SaTouba - Sur-mesure`,
      `Votre demande ${requestId} est en cours d'etude par nos artisans.`,
      `Nous analysons vos preferences et preparons une proposition personnalisee.`,
      `Devis detaille sous 48h. Questions? ${CONTACT_PHONE}`,
    ].join(' '),
    QUOTE_SENT: [
      `SaTouba - Sur-mesure`,
      `Votre devis pour la demande ${requestId} est disponible!`,
      `Connectez-vous a l'application pour consulter les details (materiaux, delai, prix).`,
      `Vous pouvez modifier ou valider le devis en ligne.`,
      `Contact: ${CONTACT_PHONE}`,
    ].join(' '),
    APPROVED: [
      `SaTouba - Sur-mesure`,
      `Excellente nouvelle! Votre demande ${requestId} est approuvee.`,
      `Nos artisans commencent la fabrication de votre bijou sur-mesure.`,
      `Delai de fabrication: 2 a 4 semaines selon la complexite.`,
      `Vous recevrez des photos d'avancement et un SMS a chaque etape.`,
      `Contact: ${CONTACT_PHONE}`,
    ].join(' '),
    COMPLETED: [
      `SaTouba - Sur-mesure`,
      `Felicitations! Votre bijou sur-mesure ${requestId} est termine!`,
      `Il est disponible en boutique pour retrait ou peut vous etre livre.`,
      `Pour organiser la remise, contactez-nous: ${CONTACT_PHONE}`,
    ].join(' '),
    CANCELLED: [
      `SaTouba - Sur-mesure`,
      `Votre demande ${requestId} a ete annulee.`,
      `Si un acompte a ete verse, contactez-nous pour les modalites de remboursement.`,
      `Nous restons a votre disposition: ${CONTACT_PHONE}`,
    ].join(' '),
  };
  const statusText = statusMessages[status] || [
    `SaTouba - Sur-mesure`,
    `Mise a jour pour votre demande ${requestId}.`,
    `Statut: ${status}.`,
    `Consultez l'application pour plus de details.`,
  ].join(' ');
  return sendSMS({ to: phone, message: statusText });
}

export async function sendNewCustomToGerantSMS(phone: string, requestId: string, customerName: string, jewelryType: string): Promise<SMSResponse> {
  const message = [
    `SaTouba - Nouvelle Demande Sur-mesure`,
    `Demande ${requestId} de ${customerName}.`,
    `Type de bijou: ${jewelryType}.`,
    `Connectez-vous au tableau de bord pour consulter les details et repondre au client.`,
  ].join(' ');
  return sendSMS({ to: phone, message });
}

// ====================================================
// REPARATION — Templates SMS
// ====================================================

export async function sendRepairRequestSMS(phone: string, requestId: string): Promise<SMSResponse> {
  const message = [
    `SaTouba - Reparation`,
    `Votre demande de reparation ${requestId} a bien ete enregistree.`,
    `Prochaines etapes:`,
    `- Deposez votre bijou en boutique: Koumassi, feux de prodromo, Abidjan`,
    `- Ou demandez un enlevement a domicile: ${CONTACT_PHONE}`,
    `- Notre artisan evaluerat le bijou et vous contactera avec un devis`,
    `Questions? ${CONTACT_PHONE}`,
  ].join(' ');
  return sendSMS({ to: phone, message });
}

export async function sendRepairStatusSMS(phone: string, requestId: string, status: string): Promise<SMSResponse> {
  const statusMessages: Record<string, string> = {
    IN_PROGRESS: [
      `SaTouba - Reparation`,
      `Votre reparation ${requestId} est en cours de traitement.`,
      `Notre artisan a commence les reparations sur votre bijou.`,
      `Delai estime: 5 a 10 jours ouvrables selon la nature des reparations.`,
      `Contact: ${CONTACT_PHONE}`,
    ].join(' '),
    WAITING_PARTS: [
      `SaTouba - Reparation`,
      `Votre reparation ${requestId}: nous attendons l'arrivee de pieces de rechange.`,
      `Delai supplementaire prevu: 3 a 7 jours.`,
      `Nous vous tenons informe des que les pieces seront recues.`,
      `Contact: ${CONTACT_PHONE}`,
    ].join(' '),
    COMPLETED: [
      `SaTouba - Reparation`,
      `Bonne nouvelle! Votre reparation ${requestId} est terminee!`,
      `Votre bijou est pret a etre recupere en boutique.`,
      `Horaires: Lundi a Samedi, 8h a 19h.`,
      `Pour organiser la remise: ${CONTACT_PHONE}`,
    ].join(' '),
    DELIVERED: [
      `SaTouba - Reparation`,
      `Votre reparation ${requestId} vous a ete remise.`,
      `Merci pour votre confiance! Votre bijou est maintenant en parfait etat.`,
      `Pour toute question ulterieure: ${CONTACT_PHONE}`,
    ].join(' '),
    CANCELLED: [
      `SaTouba - Reparation`,
      `Votre reparation ${requestId} a ete annulee.`,
      `Si un depot a ete effectue, contactez-nous pour recuperer votre bijou.`,
      `Contact: ${CONTACT_PHONE}`,
    ].join(' '),
  };
  const statusText = statusMessages[status] || [
    `SaTouba - Reparation`,
    `Mise a jour pour votre reparation ${requestId}.`,
    `Statut: ${status}.`,
    `Consultez l'application pour plus de details.`,
  ].join(' ');
  return sendSMS({ to: phone, message: statusText });
}

export async function sendNewRepairToGerantSMS(phone: string, requestId: string, customerName: string, jewelryType: string): Promise<SMSResponse> {
  const message = [
    `SaTouba - Nouvelle Demande de Reparation`,
    `Demande ${requestId} de ${customerName}.`,
    `Type de bijou: ${jewelryType}.`,
    `Connectez-vous au tableau de bord pour evaluer la reparation et repondre au client.`,
  ].join(' ');
  return sendSMS({ to: phone, message });
}

// ====================================================
// OTP — Code de verification
// ====================================================

export async function sendOTPSMS(phone: string, code: string): Promise<SMSResponse> {
  const message = `SaTouba: Votre code de verification est ${code}. Valable 10 minutes. Ne partagez ce code avec personne.`;
  return sendSMS({ to: phone, message });
}