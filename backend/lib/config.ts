// Config centralisée — regroupe les valeurs en dur précédemment dispersées.
// Chaque valeur reste pilotable par env avec le même défaut qu'avant (aucun changement de comportement).

export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
export const REFRESH_TOKEN_DAYS = Number(process.env.REFRESH_TOKEN_DAYS) || 7;
export const BCRYPT_COST = Number(process.env.BCRYPT_COST) || 12;

export const MAX_FAILED_ATTEMPTS = Number(process.env.MAX_FAILED_ATTEMPTS) || 8;
export const LOCKOUT_DURATION_MS = Number(process.env.LOCKOUT_DURATION_MS) || 10 * 60 * 1000;
export const PASSWORD_RESET_EXPIRY_MS = Number(process.env.PASSWORD_RESET_EXPIRY_MS) || 10 * 60 * 1000;
export const OTP_MIN = 100000;
export const OTP_MAX = 999999;
export const MAX_OTP_ATTEMPTS = Number(process.env.MAX_OTP_ATTEMPTS) || 5;

// Confiance proxy : 1 saut sur Vercel (X-Forwarded-For fiable). Pilote par env si infra change.
export const TRUST_PROXY = process.env.TRUST_PROXY ? Number(process.env.TRUST_PROXY) : 1;

// Idempotence commandes : durée de vie (s) d'une clé d'idempotence (Redis, fail-open si absent).
export const IDEMPOTENCY_TTL_S = Number(process.env.IDEMPOTENCY_TTL_S) || 24 * 60 * 60;
export const IDEMPOTENCY_PENDING_TTL_S = 120;

export const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_BYTES) || 5 * 1024 * 1024;
export const JSON_BODY_LIMIT = process.env.JSON_BODY_LIMIT || '1mb';

export const RATE_LIMITS = {
  auth: Number(process.env.RATE_LIMIT_AUTH) || 30,
  orders: Number(process.env.RATE_LIMIT_ORDERS) || 30,
  upload: Number(process.env.RATE_LIMIT_UPLOAD) || 20,
  global: Number(process.env.RATE_LIMIT_GLOBAL) || 200,
  register: Number(process.env.RATE_LIMIT_REGISTER) || 15,
  login: Number(process.env.RATE_LIMIT_LOGIN) || 30,
  loginGerant: Number(process.env.RATE_LIMIT_LOGIN_GERANT) || 30,
  forgotPassword: Number(process.env.RATE_LIMIT_FORGOT) || 10,
  resetPassword: Number(process.env.RATE_LIMIT_RESET) || 5,
  refresh: Number(process.env.RATE_LIMIT_REFRESH) || 30,
  usersCreate: Number(process.env.RATE_LIMIT_USERS_CREATE) || 10,
  productsCreate: Number(process.env.RATE_LIMIT_PRODUCTS_CREATE) || 20,
  productsUpdate: Number(process.env.RATE_LIMIT_PRODUCTS_UPDATE) || 30,
  cartItems: Number(process.env.RATE_LIMIT_CART) || 30,
};
export const RATE_WINDOW_MS = 60 * 1000;

export const PAGINATION_DEFAULT_LIMIT = 50;
export const PAGINATION_MAX_LIMIT = 100;

export const GERANT_IDENTIFIER = process.env.GERANT_IDENTIFIER || 'gerantSatoubaBijouterie6002';
export const PROD_URL = process.env.PROD_URL || 'https://satoubabijouterie225.vercel.app';
// Domaine personnalisé : toujours autorisé en plus (modifiable via EXTRA_ORIGINS).
export const EXTRA_ORIGINS: string[] = (process.env.EXTRA_ORIGINS || 'https://satoubabijouterie.com,https://www.satoubabijouterie.com')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

export const COUNTRY_CODE = process.env.COUNTRY_CODE || '225';
export const CONTACT_PHONE = process.env.CONTACT_PHONE || '+225 05 54 13 07 46';

export const AT_USERNAME = process.env.AFRICASTALKING_USERNAME || 'sandbox';
export const AT_API_KEY = process.env.AFRICASTALKING_API_KEY || '';
export const AT_SENDER_ID = process.env.AFRICASTALKING_SENDER_ID || 'SaTouba';
export const AT_BASE_URL =
  AT_USERNAME === 'sandbox'
    ? 'https://api.sandbox.africastalking.com'
    : 'https://api.africastalking.com';
export const SMS_TIMEOUT_MS = 10 * 1000;
export const SMS_MAX_LENGTH = 160;

export const COUPON_DEFAULT_EXPIRY = '2026-12-31';
export const FALLBACK_CATEGORY_ID = 'cat-1';
export const CART_MAX_QUANTITY = 99;
