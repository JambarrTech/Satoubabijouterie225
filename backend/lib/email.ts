import logger from './logger';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// Email templates
export function orderConfirmationEmail(orderNumber: string, customerName: string, items: string[], total: number): EmailOptions {
  const itemList = items.map(i => `<li style="padding:8px 0;border-bottom:1px solid #eee">${i}</li>`).join('');
  return {
    to: '',
    subject: `SaTouba - Commande ${orderNumber} confirmée`,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <div style="background:#0B5D1E;color:white;padding:20px;text-align:center;border-radius:8px 8px 0 0">
          <h1 style="margin:0;font-size:24px">SaTouba Bijouterie</h1>
          <p style="margin:5px 0 0;opacity:0.9">Moderne & de la Joie</p>
        </div>
        <div style="background:#f9f9f9;padding:30px;border:1px solid #eee">
          <h2 style="color:#0B5D1E">Bonjour ${customerName},</h2>
          <p>Votre commande <strong>${orderNumber}</strong> a été confirmée avec succès.</p>
          <div style="background:white;padding:20px;border-radius:8px;margin:20px 0">
            <h3 style="margin-top:0">Articles commandés</h3>
            <ul style="list-style:none;padding:0;margin:0">${itemList}</ul>
            <div style="border-top:2px solid #0B5D1E;padding-top:10px;margin-top:10px;font-size:18px;font-weight:bold">
              Total : ${total.toLocaleString()} FCFA
            </div>
          </div>
          <p>Nous vous tiendrons informé de l'avancement de votre commande.</p>
          <p style="color:#666">L'équipe SaTouba Bijouterie</p>
        </div>
        <div style="text-align:center;padding:20px;color:#999;font-size:12px">
          SaTouba Bijouterie - Koumassi, Abidjan<br>
          📞 +221 05 54 13 07 46 | 📸 @Satouba225_bijouterie
        </div>
      </body></html>
    `,
    text: `Bonjour ${customerName},\nVotre commande ${orderNumber} est confirmée.\nTotal : ${total.toLocaleString()} FCFA\n\nSaTouba Bijouterie`,
  };
}

export function passwordResetEmail(resetLink: string): EmailOptions {
  return {
    to: '',
    subject: 'SaTouba - Réinitialisation de mot de passe',
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <div style="background:#0B5D1E;color:white;padding:20px;text-align:center;border-radius:8px 8px 0 0">
          <h1 style="margin:0;font-size:24px">SaTouba Bijouterie</h1>
        </div>
        <div style="background:#f9f9f9;padding:30px;border:1px solid #eee">
          <h2 style="color:#0B5D1E">Réinitialisation de mot de passe</h2>
          <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
          <a href="${resetLink}" style="display:inline-block;background:#0B5D1E;color:white;padding:12px 30px;text-decoration:none;border-radius:8px;font-weight:bold;margin:20px 0">
            Réinitialiser mon mot de passe
          </a>
          <p style="color:#666;font-size:13px">Ce lien expire dans 1 heure. Si vous n'avez pas fait cette demande, ignorez cet email.</p>
        </div>
      </body></html>
    `,
    text: `Réinitialisez votre mot de passe : ${resetLink}\nCe lien expire dans 1 heure.`,
  };
}

export function orderStatusEmail(orderNumber: string, status: string, label: string): EmailOptions {
  return {
    to: '',
    subject: `SaTouba - Commande ${orderNumber} : ${label}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <div style="background:#0B5D1E;color:white;padding:20px;text-align:center;border-radius:8px 8px 0 0">
          <h1 style="margin:0;font-size:24px">SaTouba Bijouterie</h1>
        </div>
        <div style="background:#f9f9f9;padding:30px;border:1px solid #eee">
          <h2 style="color:#0B5D1E">Mise à jour de votre commande</h2>
          <p>Votre commande <strong>${orderNumber}</strong> a un nouveau statut :</p>
          <div style="background:#EAF7ED;padding:15px;border-radius:8px;text-align:center;font-size:18px;font-weight:bold;color:#0B5D1E">
            ${label}
          </div>
          <p style="margin-top:20px">Suivez votre commande dans votre espace personnel.</p>
        </div>
      </body></html>
    `,
    text: `Commande ${orderNumber} : ${label}`,
  };
}

// Send email function — production ready
// Supports SMTP (Nodemailer) if SMTP_HOST is set, otherwise falls back to logger.
// For SendGrid/Resend, set SMTP_HOST=smtp.sendgrid.net and credentials.
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const emailFrom = process.env.EMAIL_FROM || 'noreply@satouba-bijouterie.sn';

  if (!options.to) {
    logger.warn({ subject: options.subject }, 'EMAIL_SKIP — no recipient');
    return false;
  }

  // If SMTP not configured, log and return true (don't block orders)
  if (!smtpHost || !smtpUser || !smtpPass) {
    logger.info({ to: options.to, subject: options.subject }, 'EMAIL_SENT (mock — SMTP not configured, logged only)');
    if (process.env.NODE_ENV !== 'production') {
      logger.info({ html: options.html.slice(0, 200) }, 'EMAIL_HTML_PREVIEW');
    }
    return true;
  }

  try {
    // Lazy import to avoid hard dependency when SMTP not used
    const nodemailer = await import('nodemailer').catch(() => null);
    if (!nodemailer) {
      logger.warn('nodemailer not installed — falling back to log. Run: npm i nodemailer');
      logger.info({ to: options.to, subject: options.subject }, 'EMAIL_SENT (mock — nodemailer missing)');
      return true;
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: smtpUser, pass: smtpPass },
    });

    await transporter.sendMail({
      from: emailFrom,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    logger.info({ to: options.to, subject: options.subject }, 'EMAIL_SENT via SMTP');
    return true;
  } catch (error) {
    logger.error({ err: error, to: options.to }, 'Email send failed');
    // Don't throw — email failure shouldn't block order creation
    return false;
  }
}
