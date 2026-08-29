import axios from 'axios';
import logger from './logger';

const AT_USERNAME = process.env.AFRICASTALKING_USERNAME || 'sandbox';
const AT_API_KEY = process.env.AFRICASTALKING_API_KEY || '';
const AT_SENDER_ID = process.env.AFRICASTALKING_SENDER_ID || 'SaTouba';
const AT_BASE_URL = AT_USERNAME === 'sandbox'
  ? 'https://api.sandbox.africastalking.com'
  : 'https://api.africastalking.com';
const COUNTRY_CODE = process.env.COUNTRY_CODE || '225';

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

// --- Template SMS functions ---

export async function sendOrderConfirmationSMS(phone: string, orderNumber: string, total: number): Promise<SMSResponse> {
  const message = `SaTouba: Commande ${orderNumber} confirmee (${total.toLocaleString()} FCFA). Nos artisans preparent votre bijou. Merci !`;
  return sendSMS({ to: phone, message });
}

export async function sendShippingSMS(phone: string, orderNumber: string, trackingUrl?: string): Promise<SMSResponse> {
  const message = `SaTouba: Commande ${orderNumber} expediee ! ${trackingUrl ? `Suivi: ${trackingUrl}` : 'Livraison sous 24-48h.'}`;
  return sendSMS({ to: phone, message });
}

export async function sendDeliverySMS(phone: string, orderNumber: string): Promise<SMSResponse> {
  const message = `SaTouba: Commande ${orderNumber} livree avec succes. Merci pour votre confiance ! Votre avis nous interesse.`;
  return sendSMS({ to: phone, message });
}

export async function sendOTPSMS(phone: string, code: string): Promise<SMSResponse> {
  const message = `Votre code SaTouba: ${code}. Valable 10 min. Ne le partagez pas.`;
  return sendSMS({ to: phone, message });
}

export async function sendCustomRequestSMS(phone: string, requestId: string): Promise<SMSResponse> {
  const message = `SaTouba: Demande sur-mesure ${requestId} recue. Notre equipe vous contactera sous 24h pour discuter de votre projet.`;
  return sendSMS({ to: phone, message });
}

export async function sendRepairRequestSMS(phone: string, requestId: string): Promise<SMSResponse> {
  const message = `SaTouba: Demande reparation ${requestId} recue. Deposez votre bijou en boutique ou coursier prevu. Details a suivre.`;
  return sendSMS({ to: phone, message });
}

export async function sendPreparingSMS(phone: string, orderNumber: string): Promise<SMSResponse> {
  const message = `SaTouba: Commande ${orderNumber} est en cours de fabrication par nos artisans. Nous vous tiendrons informe de l'expedition.`;
  return sendSMS({ to: phone, message });
}

export async function sendCancelledSMS(phone: string, orderNumber: string, reason?: string): Promise<SMSResponse> {
  const reasonPart = reason ? ` Motif: ${reason}.` : '';
  const message = `SaTouba: Commande ${orderNumber} annulee.${reasonPart} Contactez-nous pour toute question.`;
  return sendSMS({ to: phone, message });
}

export async function sendNewOrderSMS(phone: string, orderNumber: string, customerName: string, total: number): Promise<SMSResponse> {
  const message = `SaTouba: Nouvelle commande ${orderNumber} de ${customerName} (${total.toLocaleString()} FCFA). Connectez-vous pour gerer.`;
  return sendSMS({ to: phone, message });
}

// --- Repair status change SMS ---

export async function sendRepairStatusSMS(phone: string, requestId: string, status: string): Promise<SMSResponse> {
  const statusMessages: Record<string, string> = {
    IN_PROGRESS: `Votre reparation ${requestId} est en cours de traitement.`,
    WAITING_PARTS: `Votre reparation ${requestId}: en attente de pieces. Nous vous tiendrons informe.`,
    COMPLETED: `Votre reparation ${requestId} est terminee. Vous pouvez recuperer votre bijou.`,
    DELIVERED: `Votre reparation ${requestId} vous a ete remise. Merci pour votre confiance !`,
    CANCELLED: `Votre reparation ${requestId} a ete annulee. Contactez-nous pour plus d'infos.`,
  };
  const statusText = statusMessages[status] || `Statut de votre reparation ${requestId} mis a jour: ${status}`;
  const message = `SaTouba: ${statusText}`;
  return sendSMS({ to: phone, message });
}

// --- Custom request status change SMS ---

export async function sendCustomStatusSMS(phone: string, requestId: string, status: string): Promise<SMSResponse> {
  const statusMessages: Record<string, string> = {
    IN_PROGRESS: `Votre demande sur-mesure ${requestId} est en cours d'etude.`,
    QUOTE_SENT: `Votre demande sur-mesure ${requestId}: devis disponible. Connectez-vous pour le consulter.`,
    APPROVED: `Votre demande sur-mesure ${requestId} est approuvee. Nos artisans commencent la fabrication.`,
    COMPLETED: `Votre bijou sur-mesure ${requestId} est termine. Vous pouvez le recuperer.`,
    CANCELLED: `Votre demande sur-mesure ${requestId} a ete annulee. Contactez-nous pour plus d'infos.`,
  };
  const statusText = statusMessages[status] || `Statut de votre demande ${requestId} mis a jour: ${status}`;
  const message = `SaTouba: ${statusText}`;
  return sendSMS({ to: phone, message });
}

// --- Notify gerant about new repair/custom ---

export async function sendNewRepairToGerantSMS(phone: string, requestId: string, customerName: string, jewelryType: string): Promise<SMSResponse> {
  const message = `SaTouba: Nouvelle reparation ${requestId} de ${customerName} — ${jewelryType}. Connectez-vous pour gerer.`;
  return sendSMS({ to: phone, message });
}

export async function sendNewCustomToGerantSMS(phone: string, requestId: string, customerName: string, jewelryType: string): Promise<SMSResponse> {
  const message = `SaTouba: Nouvelle demande sur-mesure ${requestId} de ${customerName} — ${jewelryType}. Connectez-vous pour gerer.`;
  return sendSMS({ to: phone, message });
}
