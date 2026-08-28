import axios from 'axios';

const AT_USERNAME = process.env.AFRICASTALKING_USERNAME || 'sandbox';
const AT_API_KEY = process.env.AFRICASTALKING_API_KEY || '';
const AT_SENDER_ID = process.env.AFRICASTALKING_SENDER_ID || 'SaTouba';
const AT_BASE_URL = AT_USERNAME === 'sandbox' 
  ? 'https://api.sandbox.africastalking.com' 
  : 'https://api.africastalking.com';

interface SMSOptions {
  to: string;
  message: string;
  senderId?: string;
}

interface SMSResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  recipients?: Array<{
    number: string;
    status: string;
    messageId: string;
    cost: string;
  }>;
}

export async function sendSMS(options: SMSOptions): Promise<SMSResponse> {
  if (!AT_API_KEY) {
    console.warn('Africa\'s Talking API key not configured, skipping SMS');
    return { success: false, error: 'SMS service not configured' };
  }

  try {
    const phone = formatPhoneNumber(options.to);
    
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
      }
    );

    const data = response.data;
    const recipient = data.SMSMessageData?.Recipients?.[0];

    if (recipient && recipient.status === 'Success') {
      return {
        success: true,
        messageId: recipient.messageId,
        recipients: data.SMSMessageData.Recipients,
      };
    }

    return {
      success: false,
      error: recipient?.status || 'SMS sending failed',
      recipients: data.SMSMessageData?.Recipients,
    };
  } catch (error: any) {
    console.error('SMS sending error:', error.response?.data || error.message);
    return { success: false, error: error.response?.data?.errorMessage || error.message };
  }
}

export async function sendBulkSMS(phones: string[], message: string, senderId?: string): Promise<SMSResponse> {
  if (!AT_API_KEY) {
    return { success: false, error: 'SMS service not configured' };
  }

  try {
    const formattedPhones = phones.map(formatPhoneNumber).join(',');
    
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
      }
    );

    return {
      success: true,
      recipients: response.data.SMSMessageData?.Recipients,
    };
  } catch (error: any) {
    console.error('Bulk SMS error:', error.response?.data || error.message);
    return { success: false, error: error.response?.data?.errorMessage || error.message };
  }
}

function formatPhoneNumber(phone: string): string {
  // Côte d'Ivoire : +225 (Abidjan). Préfixe modifiable via COUNTRY_CODE pour tout déploiement.
  const countryCode = process.env.COUNTRY_CODE || '225';
  let cleaned = phone.replace(/\D/g, '');

  if (cleaned.startsWith('0')) {
    cleaned = countryCode + cleaned.substring(1);
  } else if (!cleaned.startsWith(countryCode)) {
    cleaned = countryCode + cleaned;
  }

  return '+' + cleaned;
}

export async function sendOrderConfirmationSMS(phone: string, orderNumber: string, total: number): Promise<SMSResponse> {
  const message = `SaTouba: Commande ${orderNumber} confirmée (${total.toLocaleString()} FCFA). Nos artisans préparent votre bijou. Merci !`;
  return sendSMS({ to: phone, message });
}

export async function sendPaymentConfirmedSMS(phone: string, orderNumber: string): Promise<SMSResponse> {
  const message = `SaTouba: Paiement reçu pour commande ${orderNumber}. Fabrication lancée. Suivi: ${process.env.APP_URL || 'https://satouba-bijouterie.ci'}/commandes/${orderNumber}`;
  return sendSMS({ to: phone, message });
}

export async function sendShippingSMS(phone: string, orderNumber: string, trackingUrl?: string): Promise<SMSResponse> {
  const message = `SaTouba: Commande ${orderNumber} expédiée ! ${trackingUrl ? `Suivi: ${trackingUrl}` : 'Livraison sous 24-48h.'}`;
  return sendSMS({ to: phone, message });
}

export async function sendDeliverySMS(phone: string, orderNumber: string): Promise<SMSResponse> {
  const message = `SaTouba: Commande ${orderNumber} livrée avec succès. Merci pour votre confiance ! Votre avis nous intéresse.`;
  return sendSMS({ to: phone, message });
}

export async function sendOTPSMS(phone: string, code: string): Promise<SMSResponse> {
  const message = `Votre code SaTouba: ${code}. Valable 10 min. Ne le partagez pas.`;
  return sendSMS({ to: phone, message });
}

export async function sendCustomRequestSMS(phone: string, requestId: string): Promise<SMSResponse> {
  const message = `SaTouba: Demande sur-mesure ${requestId} reçue. Notre équipe vous contactera sous 24h pour discuter de votre projet.`;
  return sendSMS({ to: phone, message });
}

export async function sendRepairRequestSMS(phone: string, requestId: string): Promise<SMSResponse> {
  const message = `SaTouba: Demande réparation ${requestId} reçue. Déposez votre bijou en boutique ou coursier prévu. Détails à suivre.`;
  return sendSMS({ to: phone, message });
}