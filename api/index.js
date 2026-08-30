"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// api/_index.ts
var index_exports = {};
__export(index_exports, {
  default: () => index_default
});
module.exports = __toCommonJS(index_exports);

// backend/app.ts
var import_express16 = __toESM(require("express"), 1);
var import_cors = __toESM(require("cors"), 1);
var import_path2 = __toESM(require("path"), 1);
var import_fs2 = __toESM(require("fs"), 1);
var import_url2 = require("url");
var import_module = require("module");
var import_pino_http = __toESM(require("pino-http"), 1);

// backend/lib/logger.ts
var import_pino = __toESM(require("pino"), 1);
var isProduction = process.env.NODE_ENV === "production";
var logger = (0, import_pino.default)({
  level: process.env.LOG_LEVEL || (isProduction ? "info" : "debug"),
  // Disable pino-pretty transport entirely in bundled/serverless environments
  // (worker-thread transport doesn't survive esbuild bundling)
  transport: void 0,
  // Redact sensitive fields
  redact: {
    paths: ["req.headers.authorization", "req.headers.cookie", "password", "token", "FIREBASE_PRIVATE_KEY", "JWT_SECRET", "SMTP_PASS", "AFRICASTALKING_API_KEY"],
    censor: "[REDACTED]"
  },
  base: {
    env: process.env.NODE_ENV,
    version: process.env.npm_package_version
  }
});
var logger_default = logger;

// backend/middleware/security.ts
var import_helmet = __toESM(require("helmet"), 1);
var import_compression = __toESM(require("compression"), 1);

// backend/lib/rateLimit.ts
var import_redis = require("@upstash/redis");
var redis;
function getRedis() {
  if (redis !== void 0) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    redis = null;
    return redis;
  }
  let client;
  try {
    client = new import_redis.Redis({ url, token });
  } catch {
    client = null;
  }
  redis = client;
  return redis || null;
}
var memStore = /* @__PURE__ */ new Map();
var MEM_MAX_SIZE = 2e4;
function memCleanup(windowMs) {
  const now = Date.now();
  for (const [k, v] of memStore) {
    if (now > v.resetAt + windowMs) memStore.delete(k);
  }
  if (memStore.size > MEM_MAX_SIZE) {
    let removed = 0;
    for (const [k, v] of memStore) {
      if (now > v.resetAt) {
        memStore.delete(k);
        removed++;
      }
      if (removed > MEM_MAX_SIZE * 0.2) break;
    }
  }
}
function rateLimit(maxRequests, windowMs) {
  return async (req, res, next) => {
    const key = `${req.ip || req.socket.remoteAddress || "unknown"}`;
    const client = getRedis();
    if (client) {
      const bucketKey = `rl:${key}:${Math.floor(Date.now() / windowMs)}`;
      try {
        const count = await client.incr(bucketKey);
        if (count === 1) {
          await client.expire(bucketKey, Math.ceil(windowMs / 1e3));
        }
        if (count > maxRequests) {
          return res.status(429).json({ error: "Trop de requ\xEAtes. Veuillez r\xE9essayer plus tard." });
        }
        return next();
      } catch (err) {
        console.error("Rate limit Redis error:", err);
        return next();
      }
    }
    const now = Date.now();
    memCleanup(windowMs);
    const entry = memStore.get(key);
    if (!entry || now > entry.resetAt) {
      memStore.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    entry.count++;
    if (entry.count > maxRequests) {
      return res.status(429).json({ error: "Trop de requ\xEAtes. Veuillez r\xE9essayer plus tard." });
    }
    next();
  };
}

// backend/middleware/security.ts
function setupSecurity(app2) {
  app2.set("trust proxy", 1);
  app2.use((0, import_helmet.default)({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:", "blob:", "https://firebasestorage.googleapis.com", "https://*.googleapis.com"],
        connectSrc: ["'self'", "https://wa.me", "https://api.sandbox.africastalking.com", "https://api.africastalking.com", "https://*.googleapis.com", "https://*.firebaseio.com", "https://fcm.googleapis.com", "https://*.firebaseapp.com"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"]
      }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    hsts: {
      maxAge: 31536e3,
      includeSubDomains: true,
      preload: true
    },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" }
  }));
  app2.use((0, import_compression.default)({
    filter: (req, res) => {
      if (req.headers["x-no-compression"]) return false;
      return import_compression.default.filter(req, res);
    },
    threshold: 1024
  }));
  app2.use((req, res, next) => {
    const suspicious = /(\.\.|%00|%0d|%0a|\x00)/i;
    if (suspicious.test(req.url) || suspicious.test(decodeURIComponent(req.url))) {
      return res.status(400).json({ error: "Requete invalide" });
    }
    next();
  });
  const authRateLimit = rateLimit(15, 60 * 1e3);
  app2.use("/api/auth", authRateLimit);
  const orderRateLimit = rateLimit(10, 60 * 1e3);
  app2.use("/api/orders", orderRateLimit);
  const uploadRateLimit = rateLimit(20, 60 * 1e3);
  app2.use("/api/upload", uploadRateLimit);
  const pushRateLimit = rateLimit(10, 60 * 1e3);
  app2.use("/api/push", pushRateLimit);
  app2.use("/uploads", (_req, res, next) => {
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    next();
  });
  const globalRateLimit = rateLimit(200, 60 * 1e3);
  app2.use(globalRateLimit);
}

// backend/routes/auth.ts
var import_express = require("express");
var import_bcryptjs = __toESM(require("bcryptjs"), 1);
var import_crypto = __toESM(require("crypto"), 1);

// backend/lib/prisma.ts
var import_client = require("@prisma/client");
var globalForPrisma = globalThis;
var prisma = globalForPrisma.prisma || new import_client.PrismaClient({
  log: process.env.NODE_ENV === "production" ? ["error", "warn"] : ["error", "warn"]
});
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
prisma.$connect().catch(() => {
});

// backend/middleware/auth.ts
var import_jsonwebtoken = __toESM(require("jsonwebtoken"), 1);
function getJWTSecret() {
  const secret = process.env.JWT_SECRET || (process.env.NODE_ENV === "test" ? "test-jwt-secret-for-vitest-only" : "");
  if (!secret) {
    console.error("FATAL: JWT_SECRET is not set. Generate with: openssl rand -base64 64");
    process.exit(1);
  }
  if (process.env.NODE_ENV === "production" && secret.length < 32) {
    console.error("FATAL: JWT_SECRET too short (min 32 chars) for production.");
    process.exit(1);
  }
  return secret;
}
async function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Token d'authentification requis" });
  }
  let decoded;
  try {
    decoded = import_jsonwebtoken.default.verify(token, getJWTSecret());
  } catch {
    return res.status(401).json({ error: "Token invalide ou expir\xE9" });
  }
  try {
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, role: true }
    });
    if (!user) {
      return res.status(401).json({ error: "Session invalide \u2014 veuillez vous reconnecter" });
    }
    req.userId = user.id;
    req.userRole = user.role;
    next();
  } catch {
    return res.status(500).json({ error: "Erreur lors de la v\xE9rification de la session" });
  }
}
function requireAdmin(req, res, next) {
  if (req.userRole !== "ADMIN") {
    return res.status(403).json({ error: "Acc\xE8s r\xE9serv\xE9 aux administrateurs" });
  }
  next();
}
function generateToken(userId, role) {
  return import_jsonwebtoken.default.sign({ userId, role }, getJWTSecret(), { expiresIn: "7d" });
}

// backend/lib/sms.ts
var import_axios = __toESM(require("axios"), 1);
var AT_USERNAME = process.env.AFRICASTALKING_USERNAME || "sandbox";
var AT_API_KEY = process.env.AFRICASTALKING_API_KEY || "";
var AT_SENDER_ID = process.env.AFRICASTALKING_SENDER_ID || "SaTouba";
var AT_BASE_URL = AT_USERNAME === "sandbox" ? "https://api.sandbox.africastalking.com" : "https://api.africastalking.com";
var COUNTRY_CODE = process.env.COUNTRY_CODE || "225";
function formatPhoneNumber(phone) {
  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("0")) {
    cleaned = COUNTRY_CODE + cleaned.substring(1);
  }
  if (!cleaned.startsWith(COUNTRY_CODE)) {
    cleaned = COUNTRY_CODE + cleaned;
  }
  if (cleaned.length < 10 || cleaned.length > 15) {
    logger_default.warn({ phone, cleaned }, "Invalid phone number length");
  }
  return "+" + cleaned;
}
async function sendSMS(options) {
  if (!AT_API_KEY) {
    logger_default.warn("Africa's Talking API key not configured, skipping SMS");
    return { success: false, error: "SMS service not configured" };
  }
  const phone = formatPhoneNumber(options.to);
  logger_default.info({
    to: phone,
    messageLength: options.message.length,
    senderId: options.senderId || AT_SENDER_ID,
    environment: AT_USERNAME
  }, "SMS send attempt");
  try {
    const response = await import_axios.default.post(
      `${AT_BASE_URL}/version1/messaging`,
      new URLSearchParams({
        username: AT_USERNAME,
        to: phone,
        message: options.message,
        from: options.senderId || AT_SENDER_ID
      }),
      {
        headers: {
          "apiKey": AT_API_KEY,
          "Content-Type": "application/x-www-form-urlencoded",
          "Accept": "application/json"
        },
        timeout: 1e4
        // 10s timeout
      }
    );
    const data = response.data;
    const recipients = data.SMSMessageData?.Recipients || [];
    const recipient = recipients[0];
    if (recipient && recipient.status === "Success") {
      logger_default.info({
        to: phone,
        messageId: recipient.messageId,
        cost: recipient.cost
      }, "SMS sent successfully");
      return {
        success: true,
        messageId: recipient.messageId,
        cost: recipient.cost,
        recipients
      };
    }
    const failedRecipients = recipients.filter((r) => r.status !== "Success");
    if (failedRecipients.length > 0) {
      logger_default.warn({
        to: phone,
        failedStatuses: failedRecipients.map((r) => r.status)
      }, "SMS delivery failed for some recipients");
    }
    return {
      success: false,
      error: recipient?.status || data.SMSMessageData?.Message || "SMS sending failed",
      recipients
    };
  } catch (error) {
    const errData = error.response?.data;
    logger_default.error({
      to: phone,
      error: errData?.errorMessage || error.message,
      statusCode: error.response?.status
    }, "SMS API error");
    return {
      success: false,
      error: errData?.errorMessage || error.message
    };
  }
}
async function sendOrderConfirmationSMS(phone, orderNumber, total) {
  const message = `SaTouba: Commande ${orderNumber} confirmee (${total.toLocaleString()} FCFA). Nos artisans preparent votre bijou. Merci !`;
  return sendSMS({ to: phone, message });
}
async function sendShippingSMS(phone, orderNumber, trackingUrl) {
  const message = `SaTouba: Commande ${orderNumber} expediee ! ${trackingUrl ? `Suivi: ${trackingUrl}` : "Livraison sous 24-48h."}`;
  return sendSMS({ to: phone, message });
}
async function sendDeliverySMS(phone, orderNumber) {
  const message = `SaTouba: Commande ${orderNumber} livree avec succes. Merci pour votre confiance ! Votre avis nous interesse.`;
  return sendSMS({ to: phone, message });
}
async function sendOTPSMS(phone, code) {
  const message = `Votre code SaTouba: ${code}. Valable 10 min. Ne le partagez pas.`;
  return sendSMS({ to: phone, message });
}
async function sendCustomRequestSMS(phone, requestId) {
  const message = `SaTouba: Demande sur-mesure ${requestId} recue. Notre equipe vous contactera sous 24h pour discuter de votre projet.`;
  return sendSMS({ to: phone, message });
}
async function sendRepairRequestSMS(phone, requestId) {
  const message = `SaTouba: Demande reparation ${requestId} recue. Deposez votre bijou en boutique ou coursier prevu. Details a suivre.`;
  return sendSMS({ to: phone, message });
}
async function sendPreparingSMS(phone, orderNumber) {
  const message = `SaTouba: Commande ${orderNumber} est en cours de fabrication par nos artisans. Nous vous tiendrons informe de l'expedition.`;
  return sendSMS({ to: phone, message });
}
async function sendCancelledSMS(phone, orderNumber, reason) {
  const reasonPart = reason ? ` Motif: ${reason}.` : "";
  const message = `SaTouba: Commande ${orderNumber} annulee.${reasonPart} Contactez-nous pour toute question.`;
  return sendSMS({ to: phone, message });
}
async function sendNewOrderSMS(phone, orderNumber, customerName, total) {
  const message = `SaTouba: Nouvelle commande ${orderNumber} de ${customerName} (${total.toLocaleString()} FCFA). Connectez-vous pour gerer.`;
  return sendSMS({ to: phone, message });
}
async function sendRepairStatusSMS(phone, requestId, status) {
  const statusMessages = {
    IN_PROGRESS: `Votre reparation ${requestId} est en cours de traitement.`,
    WAITING_PARTS: `Votre reparation ${requestId}: en attente de pieces. Nous vous tiendrons informe.`,
    COMPLETED: `Votre reparation ${requestId} est terminee. Vous pouvez recuperer votre bijou.`,
    DELIVERED: `Votre reparation ${requestId} vous a ete remise. Merci pour votre confiance !`,
    CANCELLED: `Votre reparation ${requestId} a ete annulee. Contactez-nous pour plus d'infos.`
  };
  const statusText = statusMessages[status] || `Statut de votre reparation ${requestId} mis a jour: ${status}`;
  const message = `SaTouba: ${statusText}`;
  return sendSMS({ to: phone, message });
}
async function sendCustomStatusSMS(phone, requestId, status) {
  const statusMessages = {
    IN_PROGRESS: `Votre demande sur-mesure ${requestId} est en cours d'etude.`,
    QUOTE_SENT: `Votre demande sur-mesure ${requestId}: devis disponible. Connectez-vous pour le consulter.`,
    APPROVED: `Votre demande sur-mesure ${requestId} est approuvee. Nos artisans commencent la fabrication.`,
    COMPLETED: `Votre bijou sur-mesure ${requestId} est termine. Vous pouvez le recuperer.`,
    CANCELLED: `Votre demande sur-mesure ${requestId} a ete annulee. Contactez-nous pour plus d'infos.`
  };
  const statusText = statusMessages[status] || `Statut de votre demande ${requestId} mis a jour: ${status}`;
  const message = `SaTouba: ${statusText}`;
  return sendSMS({ to: phone, message });
}
async function sendNewRepairToGerantSMS(phone, requestId, customerName, jewelryType) {
  const message = `SaTouba: Nouvelle reparation ${requestId} de ${customerName} \u2014 ${jewelryType}. Connectez-vous pour gerer.`;
  return sendSMS({ to: phone, message });
}
async function sendNewCustomToGerantSMS(phone, requestId, customerName, jewelryType) {
  const message = `SaTouba: Nouvelle demande sur-mesure ${requestId} de ${customerName} \u2014 ${jewelryType}. Connectez-vous pour gerer.`;
  return sendSMS({ to: phone, message });
}

// backend/routes/auth.ts
var router = (0, import_express.Router)();
var ALLOWED_PROFILE_FIELDS = ["name", "phone", "address", "city", "country", "avatar"];
var MAX_FAILED_ATTEMPTS = 5;
var LOCKOUT_DURATION_MS = 15 * 60 * 1e3;
var PASSWORD_RESET_EXPIRY_MS = 10 * 60 * 1e3;
var GERANT_IDENTIFIER = process.env.GERANT_IDENTIFIER || "gerantSatoubaBijouterie6002";
function isValidIdentifier(id) {
  return typeof id === "string" && id.trim().length >= 3 && /^[a-zA-Z0-9_-]+$/.test(id);
}
function isStrongPassword(password) {
  if (typeof password !== "string") return { valid: false, error: "Mot de passe invalide" };
  if (password.length < 8) return { valid: false, error: "Le mot de passe doit contenir au moins 8 caract\xE8res" };
  if (!/[A-Z]/.test(password)) return { valid: false, error: "Le mot de passe doit contenir au moins une majuscule" };
  if (!/[a-z]/.test(password)) return { valid: false, error: "Le mot de passe doit contenir au moins une minuscule" };
  if (!/[0-9]/.test(password)) return { valid: false, error: "Le mot de passe doit contenir au moins un chiffre" };
  return { valid: true };
}
router.post("/api/auth/register", rateLimit(5, 6e4), async (req, res) => {
  try {
    const { name, identifier, password, phone } = req.body;
    if (!name || !identifier || !password) {
      return res.status(400).json({ error: "Nom, identifiant et mot de passe requis" });
    }
    if (typeof name !== "string" || name.trim().length < 2) {
      return res.status(400).json({ error: "Le nom doit contenir au moins 2 caract\xE8res" });
    }
    if (!isValidIdentifier(identifier)) {
      return res.status(400).json({ error: "L'identifiant doit contenir au moins 3 caract\xE8res (lettres, chiffres, tirets ou underscores)" });
    }
    const pwdCheck = isStrongPassword(password);
    if (!pwdCheck.valid) {
      return res.status(400).json({ error: pwdCheck.error });
    }
    const existing = await prisma.user.findUnique({ where: { identifier: identifier.toLowerCase() } });
    if (existing) {
      return res.status(400).json({ error: "Un compte existe d\xE9j\xE0 avec cet identifiant" });
    }
    const hashedPassword = await import_bcryptjs.default.hash(password, 12);
    const user = await prisma.user.create({
      data: { name: name.trim(), identifier: identifier.toLowerCase(), password: hashedPassword, phone: phone || null }
    });
    await prisma.cart.create({ data: { userId: user.id } });
    const token = generateToken(user.id, user.role);
    const { password: _, ...userWithoutPassword } = user;
    logger_default.info({ userId: user.id, identifier: user.identifier }, "User registered");
    res.status(201).json({ user: userWithoutPassword, token });
  } catch (error) {
    logger_default.error({ err: error }, "Register error");
    res.status(500).json({ error: "Erreur lors de l'inscription" });
  }
});
router.post("/api/auth/login", rateLimit(10, 6e4), async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ error: "Identifiant et mot de passe requis" });
    }
    const user = await prisma.user.findUnique({ where: { identifier: identifier.toLowerCase() } });
    if (!user) {
      return res.status(401).json({ error: "Identifiant ou mot de passe incorrect" });
    }
    if (user.lockedUntil && user.lockedUntil > /* @__PURE__ */ new Date()) {
      const remainingMin = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 6e4);
      return res.status(423).json({
        error: `Compte temporairement verrouill\xE9. R\xE9essayez dans ${remainingMin} minute${remainingMin > 1 ? "s" : ""}.`,
        lockedUntil: user.lockedUntil.toISOString()
      });
    }
    if (user.lockedUntil && user.lockedUntil <= /* @__PURE__ */ new Date()) {
      await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null }
      });
    }
    const validPassword = await import_bcryptjs.default.compare(password, user.password);
    if (!validPassword) {
      const newFailedCount = user.failedLoginAttempts + 1;
      const updateData = { failedLoginAttempts: newFailedCount };
      if (newFailedCount >= MAX_FAILED_ATTEMPTS) {
        updateData.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
        logger_default.warn({ userId: user.id, identifier: user.identifier }, "Account locked after failed attempts");
      }
      await prisma.user.update({ where: { id: user.id }, data: updateData });
      const remaining = MAX_FAILED_ATTEMPTS - newFailedCount;
      if (remaining > 0) {
        return res.status(401).json({ error: `Identifiant ou mot de passe incorrect. ${remaining} tentative${remaining > 1 ? "s" : ""} restante${remaining > 1 ? "s" : ""}.` });
      }
      return res.status(423).json({
        error: "Compte temporairement verrouill\xE9 apr\xE8s 5 tentatives \xE9chou\xE9es. R\xE9essayez dans 15 minutes.",
        lockedUntil: updateData.lockedUntil.toISOString()
      });
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: /* @__PURE__ */ new Date() }
    });
    const token = generateToken(user.id, user.role);
    const { password: _, ...userWithoutPassword } = user;
    logger_default.info({ userId: user.id, identifier: user.identifier }, "User logged in");
    res.json({ user: userWithoutPassword, token });
  } catch (error) {
    logger_default.error({ err: error }, "Login error");
    res.status(500).json({ error: "Erreur lors de la connexion" });
  }
});
router.post("/api/auth/login-gerant", rateLimit(10, 6e4), async (req, res) => {
  try {
    const { identifier, password } = req.body;
    const loginId = identifier || GERANT_IDENTIFIER;
    if (!password) {
      return res.status(400).json({ error: "Mot de passe requis" });
    }
    const user = await prisma.user.findUnique({ where: { identifier: loginId } });
    if (!user || user.role !== "ADMIN") {
      return res.status(401).json({ error: "Identifiant ou mot de passe incorrect" });
    }
    if (user.lockedUntil && user.lockedUntil > /* @__PURE__ */ new Date()) {
      const remainingMin = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 6e4);
      return res.status(423).json({
        error: `Compte temporairement verrouill\xE9. R\xE9essayez dans ${remainingMin} minute${remainingMin > 1 ? "s" : ""}.`,
        lockedUntil: user.lockedUntil.toISOString()
      });
    }
    if (user.lockedUntil && user.lockedUntil <= /* @__PURE__ */ new Date()) {
      await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null }
      });
    }
    const validPassword = await import_bcryptjs.default.compare(password, user.password);
    if (!validPassword) {
      const newFailedCount = user.failedLoginAttempts + 1;
      const updateData = { failedLoginAttempts: newFailedCount };
      if (newFailedCount >= MAX_FAILED_ATTEMPTS) {
        updateData.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
        logger_default.warn({ userId: user.id }, "Gerant account locked after failed attempts");
      }
      await prisma.user.update({ where: { id: user.id }, data: updateData });
      const remaining = MAX_FAILED_ATTEMPTS - newFailedCount;
      if (remaining > 0) {
        return res.status(401).json({ error: `Identifiant ou mot de passe incorrect. ${remaining} tentative${remaining > 1 ? "s" : ""} restante${remaining > 1 ? "s" : ""}.` });
      }
      return res.status(423).json({
        error: "Compte temporairement verrouill\xE9 apr\xE8s 5 tentatives \xE9chou\xE9es. R\xE9essayez dans 15 minutes.",
        lockedUntil: updateData.lockedUntil.toISOString()
      });
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: /* @__PURE__ */ new Date() }
    });
    const token = generateToken(user.id, user.role);
    const { password: _, ...userWithoutPassword } = user;
    logger_default.info({ userId: user.id }, "Gerant logged in");
    res.json({ user: userWithoutPassword, token });
  } catch (error) {
    logger_default.error({ err: error }, "Gerant login error");
    res.status(500).json({ error: "Erreur lors de la connexion" });
  }
});
router.get("/api/auth/me", authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, name: true, identifier: true, phone: true, avatar: true, role: true, address: true, city: true, country: true, createdAt: true, lastLoginAt: true }
    });
    if (!user) {
      return res.status(404).json({ error: "Utilisateur non trouv\xE9" });
    }
    res.json(user);
  } catch {
    res.status(500).json({ error: "Erreur" });
  }
});
router.put("/api/auth/me", authenticateToken, async (req, res) => {
  try {
    const updateData = {};
    for (const key of ALLOWED_PROFILE_FIELDS) {
      if (req.body[key] !== void 0) {
        updateData[key] = req.body[key];
      }
    }
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: "Aucun champ \xE0 modifier" });
    }
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: updateData,
      select: { id: true, name: true, identifier: true, phone: true, avatar: true, role: true, address: true, city: true, country: true, createdAt: true }
    });
    res.json(user);
  } catch {
    res.status(500).json({ error: "Erreur lors de la mise \xE0 jour" });
  }
});
router.post("/api/auth/change-password", authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Mot de passe actuel et nouveau mot de passe requis" });
    }
    const pwdCheck = isStrongPassword(newPassword);
    if (!pwdCheck.valid) {
      return res.status(400).json({ error: pwdCheck.error });
    }
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) {
      return res.status(404).json({ error: "Utilisateur non trouv\xE9" });
    }
    const validPassword = await import_bcryptjs.default.compare(currentPassword, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: "Mot de passe actuel incorrect" });
    }
    if (currentPassword === newPassword) {
      return res.status(400).json({ error: "Le nouveau mot de passe doit \xEAtre diff\xE9rent de l'actuel" });
    }
    const hashedPassword = await import_bcryptjs.default.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: req.userId },
      data: { password: hashedPassword }
    });
    logger_default.info({ userId: req.userId }, "Password changed");
    res.json({ success: true, message: "Mot de passe modifi\xE9 avec succ\xE8s" });
  } catch (error) {
    logger_default.error({ err: error }, "Change password error");
    res.status(500).json({ error: "Erreur lors du changement de mot de passe" });
  }
});
router.post("/api/auth/forgot-password", rateLimit(3, 6e4), async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone || typeof phone !== "string" || phone.trim().length < 8) {
      return res.status(400).json({ error: "Num\xE9ro de t\xE9l\xE9phone valide requis" });
    }
    const user = await prisma.user.findFirst({ where: { phone: phone.trim() } });
    if (!user) {
      return res.json({ success: true, message: "Si un compte existe avec ce num\xE9ro, un code de r\xE9initialisation a \xE9t\xE9 envoy\xE9 par SMS." });
    }
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true }
    });
    const otp = import_crypto.default.randomInt(1e5, 999999).toString();
    const hashedToken = import_crypto.default.createHash("sha256").update(otp).digest("hex");
    await prisma.passwordResetToken.create({
      data: {
        token: hashedToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + PASSWORD_RESET_EXPIRY_MS)
      }
    });
    if (user.phone) {
      await sendOTPSMS(user.phone, otp);
    }
    logger_default.info({ userId: user.id }, "Password reset OTP sent via SMS");
    res.json({ success: true, message: "Si un compte existe avec ce num\xE9ro, un code de r\xE9initialisation a \xE9t\xE9 envoy\xE9 par SMS." });
  } catch (error) {
    logger_default.error({ err: error }, "Forgot password error");
    res.status(500).json({ error: "Erreur lors de la demande de r\xE9initialisation" });
  }
});
router.post("/api/auth/reset-password", rateLimit(5, 6e4), async (req, res) => {
  try {
    const { phone, otp, newPassword } = req.body;
    if (!phone || !otp || !newPassword) {
      return res.status(400).json({ error: "T\xE9l\xE9phone, code OTP et nouveau mot de passe requis" });
    }
    const pwdCheck = isStrongPassword(newPassword);
    if (!pwdCheck.valid) {
      return res.status(400).json({ error: pwdCheck.error });
    }
    const user = await prisma.user.findFirst({ where: { phone: phone.trim() } });
    if (!user) {
      return res.status(400).json({ error: "Aucun compte trouv\xE9 avec ce num\xE9ro" });
    }
    const hashedToken = import_crypto.default.createHash("sha256").update(otp.toString()).digest("hex");
    const resetRecord = await prisma.passwordResetToken.findFirst({
      where: {
        token: hashedToken,
        userId: user.id,
        used: false,
        expiresAt: { gt: /* @__PURE__ */ new Date() }
      }
    });
    if (!resetRecord) {
      return res.status(400).json({ error: "Code invalide ou expir\xE9" });
    }
    const hashedPassword = await import_bcryptjs.default.hash(newPassword, 12);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetRecord.userId },
        data: { password: hashedPassword, failedLoginAttempts: 0, lockedUntil: null }
      }),
      prisma.passwordResetToken.update({
        where: { id: resetRecord.id },
        data: { used: true }
      })
    ]);
    logger_default.info({ userId: resetRecord.userId }, "Password reset completed via OTP");
    res.json({ success: true, message: "Mot de passe r\xE9initialis\xE9 avec succ\xE8s" });
  } catch (error) {
    logger_default.error({ err: error }, "Reset password error");
    res.status(500).json({ error: "Erreur lors de la r\xE9initialisation du mot de passe" });
  }
});
var auth_default = router;

// backend/routes/categories.ts
var import_express2 = require("express");
var router2 = (0, import_express2.Router)();
router2.get("/api/categories", async (_req, res) => {
  try {
    const categories = await prisma.category.findMany({
      include: { _count: { select: { products: true } } }
    });
    res.json(categories.map((c) => ({ ...c, itemCount: c._count.products })));
  } catch {
    res.status(500).json({ error: "Erreur lors du chargement des cat\xE9gories" });
  }
});
router2.post("/api/categories", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, image, description } = req.body;
    if (!name) return res.status(400).json({ error: "Nom requis" });
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const category = await prisma.category.create({
      data: { name, slug, image: image || null, description: description || null }
    });
    res.status(201).json(category);
  } catch {
    res.status(500).json({ error: "Erreur" });
  }
});
router2.put("/api/categories/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, image, description } = req.body;
    const data = {};
    if (name) {
      data.name = name;
      data.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    }
    if (image !== void 0) data.image = image;
    if (description !== void 0) data.description = description;
    const category = await prisma.category.update({ where: { id: req.params.id }, data });
    res.json(category);
  } catch {
    res.status(500).json({ error: "Erreur" });
  }
});
router2.delete("/api/categories/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const productCount = await prisma.product.count({ where: { categoryId: req.params.id } });
    if (productCount > 0) {
      return res.status(400).json({ error: `${productCount} produit(s) utilisent cette cat\xE9gorie. Supprimez-les d'abord.` });
    }
    await prisma.category.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Erreur" });
  }
});
var categories_default = router2;

// backend/routes/products.ts
var import_express3 = require("express");

// backend/lib/helpers.ts
function safeJsonParse(value, fallback = null) {
  if (value === null || value === void 0) return fallback;
  if (typeof value === "object") return value;
  if (typeof value !== "string") return fallback;
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}
async function calculateCartTotal(_cart, cartItems) {
  let subtotal = 0;
  for (const item of cartItems) {
    const price = Number(item.product.price) || 0;
    const qty = Number(item.quantity) || 0;
    subtotal += price * qty;
  }
  const settings = await prisma.storeSettings.findMany({
    where: { key: { in: ["shipping_fee", "free_shipping_threshold"] } }
  });
  const settingsMap = new Map(settings.map((s) => [s.key, s.value]));
  const shippingFeeValue = parseInt(settingsMap.get("shipping_fee") || "0") || 0;
  const freeThreshold = parseInt(settingsMap.get("free_shipping_threshold") || "0") || 0;
  const shippingFee = subtotal > freeThreshold ? 0 : subtotal > 0 ? shippingFeeValue : 0;
  const total = subtotal + shippingFee;
  return { subtotal, discount: 0, shippingFee, total };
}
function formatCartItems(items) {
  if (!Array.isArray(items)) return [];
  return items.map((i) => ({
    ...i,
    product: {
      ...i.product,
      images: safeJsonParse(i.product?.images, []),
      price: Number(i.product?.price) || 0,
      stockQuantity: Number(i.product?.stockQuantity) || 0,
      name: i.product?.name || "Produit"
    }
  }));
}

// backend/lib/sanitize.ts
var HTML_TAG = /<[^>]*>/g;
var SCRIPT_TAG = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
var EVENT_HANDLER = /\s*on\w+\s*=\s*["'][^"']*["']/gi;
var MAX_LENGTH = 5e3;
function sanitizeString(input) {
  if (typeof input !== "string") return "";
  return input.replace(SCRIPT_TAG, "").replace(EVENT_HANDLER, "").replace(HTML_TAG, "").trim().slice(0, MAX_LENGTH);
}
function isValidPhone(phone) {
  const cleaned = phone.replace(/\D/g, "");
  return cleaned.length >= 8 && cleaned.length <= 15;
}

// backend/routes/products.ts
var router3 = (0, import_express3.Router)();
router3.get("/api/products", async (req, res) => {
  try {
    const { category, search, isBestSeller, isPromo, includeAll, page = "1", limit = "50", sort = "newest" } = req.query;
    const where = {};
    if (includeAll !== "true") {
      where.inStock = true;
    }
    if (category && search) {
      where.AND = [
        { OR: [{ categoryId: category }, { category: { slug: category } }] },
        { OR: [{ name: { contains: search } }, { description: { contains: search } }] }
      ];
    } else if (category) {
      where.OR = [
        { categoryId: category },
        { category: { slug: category } }
      ];
    } else if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } }
      ];
    }
    if (isBestSeller === "true") where.isBestSeller = true;
    if (isPromo === "true") where.isPromo = true;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;
    const orderBy = (() => {
      switch (sort) {
        case "price_asc":
          return { price: "asc" };
        case "price_desc":
          return { price: "desc" };
        case "popular":
          return { createdAt: "desc" };
        case "best_seller":
          return [{ isBestSeller: "desc" }, { createdAt: "desc" }];
        default:
          return { createdAt: "desc" };
      }
    })();
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { category: true },
        orderBy,
        skip,
        take: limitNum
      }),
      prisma.product.count({ where })
    ]);
    const parsed = products.map((p) => ({
      ...p,
      images: safeJsonParse(p.images, [])
    }));
    res.json({
      data: parsed,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    logger_default.error({ err: error }, "Products error");
    res.status(500).json({ error: "Erreur lors du chargement des produits" });
  }
});
router3.get("/api/products/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const product = await prisma.product.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      include: { category: true }
    });
    if (!product) return res.status(404).json({ error: "Produit non trouv\xE9" });
    res.json({ ...product, images: safeJsonParse(product.images, []) });
  } catch {
    res.status(500).json({ error: "Erreur" });
  }
});
var ALLOWED_PRODUCT_FIELDS = ["name", "slug", "categoryId", "description", "price", "compareAtPrice", "images", "material", "collection", "carats", "weightGrams", "stockQuantity", "isBestSeller", "isNew", "isPromo"];
router3.post("/api/products", authenticateToken, requireAdmin, rateLimit(20, 6e4), async (req, res) => {
  try {
    const data = req.body;
    if (!data.name || !data.price) {
      return res.status(400).json({ error: "Nom et prix requis" });
    }
    const price = Number(data.price);
    if (isNaN(price) || price < 0) {
      return res.status(400).json({ error: "Prix invalide" });
    }
    const stockQuantity = Number(data.stockQuantity) || 0;
    if (stockQuantity < 0) {
      return res.status(400).json({ error: "Quantit\xE9 en stock invalide" });
    }
    const filtered = {};
    for (const key of ALLOWED_PRODUCT_FIELDS) {
      if (data[key] !== void 0) filtered[key] = data[key];
    }
    if (filtered.name) filtered.name = sanitizeString(filtered.name);
    if (filtered.description) filtered.description = sanitizeString(filtered.description);
    if (filtered.material) filtered.material = sanitizeString(filtered.material);
    if (filtered.collection) filtered.collection = sanitizeString(filtered.collection);
    const product = await prisma.product.create({
      data: {
        name: filtered.name,
        slug: filtered.slug || filtered.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        categoryId: filtered.categoryId || "cat-1",
        description: filtered.description || "",
        price,
        compareAtPrice: filtered.compareAtPrice ? Number(filtered.compareAtPrice) : null,
        images: JSON.stringify(filtered.images || []),
        material: filtered.material || null,
        collection: filtered.collection || null,
        carats: filtered.carats ? String(filtered.carats) : null,
        weightGrams: filtered.weightGrams ? Number(filtered.weightGrams) : null,
        stockQuantity,
        isBestSeller: Boolean(filtered.isBestSeller),
        isNew: Boolean(filtered.isNew),
        isPromo: Boolean(filtered.isPromo)
      }
    });
    res.status(201).json({ ...product, images: safeJsonParse(product.images, []) });
  } catch (error) {
    logger_default.error({ err: error }, "Create product error");
    res.status(500).json({ error: "Erreur lors de la cr\xE9ation du produit" });
  }
});
router3.put("/api/products/:id", authenticateToken, requireAdmin, rateLimit(30, 6e4), async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const updateData = {};
    for (const key of ALLOWED_PRODUCT_FIELDS) {
      if (data[key] !== void 0) {
        updateData[key] = data[key];
      }
    }
    if (updateData.name) updateData.name = sanitizeString(updateData.name);
    if (updateData.description) updateData.description = sanitizeString(updateData.description);
    if (updateData.material) updateData.material = sanitizeString(updateData.material);
    if (updateData.collection) updateData.collection = sanitizeString(updateData.collection);
    if (data.images && Array.isArray(data.images)) {
      updateData.images = JSON.stringify(data.images);
    }
    if (updateData.price !== void 0) {
      const p = Number(updateData.price);
      if (isNaN(p) || p < 0) return res.status(400).json({ error: "Prix invalide" });
    }
    if (updateData.stockQuantity !== void 0) {
      const s = Number(updateData.stockQuantity);
      if (isNaN(s) || s < 0) return res.status(400).json({ error: "Quantit\xE9 en stock invalide" });
      updateData.inStock = s > 0;
    }
    const product = await prisma.product.update({ where: { id }, data: updateData });
    res.json({ ...product, images: safeJsonParse(product.images, []) });
  } catch {
    res.status(500).json({ error: "Erreur lors de la mise \xE0 jour" });
  }
});
router3.delete("/api/products/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.$transaction(async (tx) => {
      await tx.cartItem.deleteMany({ where: { productId: id } });
      await tx.favorite.deleteMany({ where: { productId: id } });
      await tx.like.deleteMany({ where: { productId: id } });
      await tx.product.update({ where: { id }, data: { inStock: false, stockQuantity: 0 } });
    });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Erreur lors de la suppression" });
  }
});
var products_default = router3;

// backend/routes/cart.ts
var import_express4 = require("express");
var router4 = (0, import_express4.Router)();
router4.get("/api/cart", authenticateToken, async (req, res) => {
  try {
    const cart = await prisma.cart.findUnique({
      where: { userId: req.userId },
      include: { items: { include: { product: true } } }
    });
    if (!cart) {
      const newCart = await prisma.cart.create({
        data: { userId: req.userId },
        include: { items: { include: { product: true } } }
      });
      const totals2 = await calculateCartTotal(newCart, newCart.items);
      return res.json({ ...newCart, ...totals2, items: formatCartItems(newCart.items) });
    }
    const totals = await calculateCartTotal(cart, cart.items);
    res.json({ ...cart, ...totals, items: formatCartItems(cart.items) });
  } catch (error) {
    logger_default.error({ err: error }, "Cart error");
    res.status(500).json({ error: "Erreur lors du chargement du panier" });
  }
});
router4.put("/api/cart/items/:id", authenticateToken, async (req, res) => {
  try {
    const { quantity } = req.body;
    if (!quantity || quantity < 1) {
      return res.status(400).json({ error: "Quantit\xE9 invalide" });
    }
    const item = await prisma.cartItem.findUnique({ where: { id: req.params.id } });
    if (!item) return res.status(404).json({ error: "Article non trouv\xE9" });
    const cart = await prisma.cart.findUnique({ where: { userId: req.userId } });
    if (!cart || item.cartId !== cart.id) {
      return res.status(403).json({ error: "Acc\xE8s refus\xE9" });
    }
    const product = await prisma.product.findUnique({
      where: { id: item.productId },
      select: { stockQuantity: true, name: true }
    });
    if (product && product.stockQuantity < quantity) {
      return res.status(400).json({
        error: `"${product.name}" n'a que ${product.stockQuantity} en stock`
      });
    }
    await prisma.cartItem.update({ where: { id: req.params.id }, data: { quantity: Number(quantity) } });
    const updatedCart = await prisma.cart.findUnique({
      where: { userId: req.userId },
      include: { items: { include: { product: true } } }
    });
    if (!updatedCart) return res.status(500).json({ error: "Erreur" });
    const totals = await calculateCartTotal(updatedCart, updatedCart.items);
    res.json({ ...updatedCart, ...totals, items: formatCartItems(updatedCart.items) });
  } catch (error) {
    logger_default.error({ err: error }, "Update cart quantity error");
    res.status(500).json({ error: "Erreur" });
  }
});
router4.post("/api/cart/items", authenticateToken, rateLimit(30, 6e4), async (req, res) => {
  try {
    const { productId, quantity = 1, selectedSize, selectedMaterial } = req.body;
    if (!productId || typeof quantity !== "number" || quantity < 1) {
      return res.status(400).json({ error: "Produit et quantite valide requis" });
    }
    if (quantity > 99) {
      return res.status(400).json({ error: "Quantite maximale depassee" });
    }
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return res.status(404).json({ error: "Produit non trouv\xE9" });
    if (!product.inStock || product.stockQuantity < quantity) {
      return res.status(400).json({ error: `"${product.name}" n'a que ${product.stockQuantity} en stock` });
    }
    let cart = await prisma.cart.findUnique({ where: { userId: req.userId } });
    if (!cart) {
      cart = await prisma.cart.create({ data: { userId: req.userId } });
    }
    const existingItem = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId,
        selectedSize: selectedSize || null,
        selectedMaterial: selectedMaterial || null
      }
    });
    if (existingItem) {
      const newQty = existingItem.quantity + quantity;
      if (product.stockQuantity < newQty) {
        return res.status(400).json({ error: `"${product.name}" n'a que ${product.stockQuantity} en stock` });
      }
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQty }
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          quantity,
          selectedSize: selectedSize || null,
          selectedMaterial: selectedMaterial || null
        }
      });
    }
    const updatedCart = await prisma.cart.findUnique({
      where: { userId: req.userId },
      include: { items: { include: { product: true } } }
    });
    if (!updatedCart) return res.status(500).json({ error: "Erreur" });
    const totals = await calculateCartTotal(updatedCart, updatedCart.items);
    res.json({ ...updatedCart, ...totals, items: formatCartItems(updatedCart.items) });
  } catch (error) {
    logger_default.error({ err: error }, "Add to cart error");
    res.status(500).json({ error: "Erreur lors de l'ajout au panier" });
  }
});
router4.delete("/api/cart/items/:id", authenticateToken, async (req, res) => {
  try {
    const item = await prisma.cartItem.findUnique({ where: { id: req.params.id } });
    if (!item) return res.status(404).json({ error: "Article non trouv\xE9" });
    const cart = await prisma.cart.findUnique({ where: { userId: req.userId } });
    if (!cart || item.cartId !== cart.id) {
      return res.status(403).json({ error: "Acc\xE8s refus\xE9" });
    }
    await prisma.cartItem.delete({ where: { id: req.params.id } });
    const updatedCart = await prisma.cart.findUnique({
      where: { userId: req.userId },
      include: { items: { include: { product: true } } }
    });
    if (!updatedCart) return res.status(500).json({ error: "Erreur" });
    const totals = await calculateCartTotal(updatedCart, updatedCart.items);
    res.json({ ...updatedCart, ...totals, items: formatCartItems(updatedCart.items) });
  } catch {
    res.status(500).json({ error: "Erreur lors de la suppression" });
  }
});
router4.delete("/api/cart", authenticateToken, async (req, res) => {
  try {
    const cart = await prisma.cart.findUnique({ where: { userId: req.userId } });
    if (cart) {
      await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    }
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Erreur" });
  }
});
var cart_default = router4;

// backend/routes/orders.ts
var import_express5 = require("express");

// backend/lib/push.ts
var import_firebase_admin = __toESM(require("firebase-admin"), 1);
var firebaseApp = null;
function initFirebase() {
  if (firebaseApp) return firebaseApp;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) {
    console.warn("Firebase credentials not configured, push notifications disabled");
    return null;
  }
  try {
    firebaseApp = import_firebase_admin.default.initializeApp({
      credential: import_firebase_admin.default.credential.cert({
        projectId,
        clientEmail,
        privateKey
      })
    });
    console.log("Firebase Admin SDK initialized");
    return firebaseApp;
  } catch (error) {
    console.error("Firebase init error:", error);
    return null;
  }
}
async function sendMulticastPushNotification(tokens, title, body, data, imageUrl) {
  const app2 = initFirebase();
  if (!app2) {
    return { success: 0, failed: tokens.length, errors: ["Firebase not initialized"] };
  }
  if (tokens.length === 0) {
    return { success: 0, failed: 0, errors: [] };
  }
  try {
    const messaging = import_firebase_admin.default.messaging(app2);
    const response = await messaging.sendEachForMulticast({
      tokens,
      notification: { title, body, imageUrl },
      data: data || {},
      android: {
        priority: "high",
        notification: { channelId: "satouba_default", icon: "ic_notification", color: "#0B5D1E" }
      },
      apns: {
        payload: { aps: { alert: { title, body }, badge: 1, sound: "default" } }
      }
    });
    const errors = [];
    const invalidTokens = [];
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        errors.push(`Token ${idx}: ${resp.error?.message}`);
        if (resp.error?.code === "messaging/registration-token-not-registered") {
          invalidTokens.push({ userId: "", token: tokens[idx] });
        }
      }
    });
    if (invalidTokens.length > 0) {
      try {
        const invalidTokenStrings = invalidTokens.map((t) => t.token);
        const users = await prisma.user.findMany({
          select: { id: true, pushTokens: true }
        });
        for (const user of users) {
          const tokens2 = typeof user.pushTokens === "string" ? JSON.parse(user.pushTokens || "[]") : Array.isArray(user.pushTokens) ? user.pushTokens : [];
          const cleaned = tokens2.filter((t) => !invalidTokenStrings.includes(t));
          if (cleaned.length !== tokens2.length) {
            await prisma.user.update({
              where: { id: user.id },
              data: { pushTokens: JSON.stringify(cleaned) }
            });
          }
        }
      } catch {
      }
    }
    return {
      success: response.successCount,
      failed: response.failureCount,
      errors
    };
  } catch (error) {
    console.error("Multicast push error:", error);
    return { success: 0, failed: tokens.length, errors: [error.message] };
  }
}
function getOrderPushContent(data) {
  switch (data.type) {
    case "CONFIRMED":
      return {
        title: "Commande confirm\xE9e",
        body: `Votre commande ${data.orderNumber} a \xE9t\xE9 confirm\xE9e. Nos artisans commencent la fabrication.`,
        clickAction: `/commandes/${data.orderId}`
      };
    case "PREPARING":
      return {
        title: "En cours de fabrication",
        body: `Votre commande ${data.orderNumber} est en cours de pr\xE9paration par nos artisans.`,
        clickAction: `/commandes/${data.orderId}`
      };
    case "SHIPPED":
      return {
        title: "Commande exp\xE9di\xE9e",
        body: `Votre commande ${data.orderNumber} est en route. Livraison pr\xE9vue sous 24-48h.`,
        clickAction: `/commandes/${data.orderId}`
      };
    case "DELIVERED":
      return {
        title: "Livr\xE9 avec succ\xE8s",
        body: `Commande ${data.orderNumber} livr\xE9e. Merci pour votre confiance SaTouba !`,
        clickAction: `/commandes/${data.orderId}`
      };
    case "CANCELLED":
      return {
        title: "Commande annul\xE9e",
        body: `Votre commande ${data.orderNumber} a \xE9t\xE9 annul\xE9e. Contactez-nous pour plus d'infos.`,
        clickAction: `/commandes/${data.orderId}`
      };
    default:
      return {
        title: "SaTouba",
        body: `Mise \xE0 jour pour votre commande ${data.orderNumber}`,
        clickAction: `/commandes/${data.orderId}`
      };
  }
}

// backend/lib/notifications.ts
function getPushTokens(user) {
  try {
    const tokens = user.pushTokens;
    if (Array.isArray(tokens)) return tokens;
    if (typeof tokens === "string") return JSON.parse(tokens);
    return [];
  } catch {
    return [];
  }
}
async function createNotification(options) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId: options.userId,
        title: options.title,
        message: options.message,
        type: options.type,
        read: false
      }
    });
    await sendNotificationToUser({
      userId: options.userId,
      title: options.title,
      body: options.message,
      data: options.data,
      channel: options.channel || "BOTH"
    });
    return notification;
  } catch (error) {
    logger_default.error({ err: error }, "Create notification error");
    throw error;
  }
}
async function sendNotificationToUser(options) {
  const user = await prisma.user.findUnique({
    where: { id: options.userId },
    select: { pushTokens: true }
  });
  if (!user) return;
  const tokens = getPushTokens({ pushTokens: user.pushTokens });
  if (options.channel === "PUSH" || options.channel === "BOTH") {
    if (tokens.length > 0) {
      await sendMulticastPushNotification(tokens, options.title, options.body, options.data);
    }
  }
}
async function notifyNewOrder(orderId) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: { select: { id: true, name: true, phone: true, pushTokens: true } },
      items: true
    }
  });
  if (!order) return;
  const pushData = { orderId, orderNumber: order.orderNumber, type: "CONFIRMED" };
  const { title, body, clickAction } = getOrderPushContent(pushData);
  await createNotification({
    userId: order.user.id,
    title,
    message: body,
    type: "ORDER",
    channel: "PUSH",
    data: { orderId, orderNumber: order.orderNumber, status: "CONFIRMED", clickAction },
    orderId
  });
  if (order.user.phone) {
    await sendOrderConfirmationSMS(order.user.phone, order.orderNumber, order.totalAmount);
  }
  await notifyGerantsNewOrder(order);
}
async function notifyGerantsNewOrder(order) {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true, phone: true, pushTokens: true }
  });
  const itemCount = order.items.reduce((sum, i) => sum + i.quantity, 0);
  const itemsList = order.items.map((i) => `${i.productName} x${i.quantity}`).join(", ");
  for (const admin2 of admins) {
    const title = "Nouvelle commande";
    const message = `Commande ${order.orderNumber} de ${order.customerName} \u2014 ${order.totalAmount.toLocaleString()} FCFA (${itemCount} article${itemCount > 1 ? "s" : ""}). Articles: ${itemsList}.`;
    await createNotification({
      userId: admin2.id,
      title,
      message,
      type: "ORDER",
      channel: "PUSH",
      data: { orderId: order.id, orderNumber: order.orderNumber, type: "NEW_ORDER" },
      orderId: order.id
    });
    if (admin2.phone) {
      await sendNewOrderSMS(admin2.phone, order.orderNumber, order.customerName, order.totalAmount);
    }
  }
}
async function notifyOrderStatusChange(orderId, status) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { user: { select: { id: true, phone: true, pushTokens: true } } }
  });
  if (!order || !order.user) return;
  const pushData = { orderId, orderNumber: order.orderNumber, type: status };
  const { title, body, clickAction } = getOrderPushContent(pushData);
  await createNotification({
    userId: order.user.id,
    title,
    message: body,
    type: "ORDER",
    channel: "PUSH",
    data: { orderId, orderNumber: order.orderNumber, status, clickAction },
    orderId
  });
  if (order.user.phone) {
    switch (status) {
      case "CONFIRMED":
        await sendOrderConfirmationSMS(order.user.phone, order.orderNumber, order.totalAmount);
        break;
      case "PREPARING":
        await sendPreparingSMS(order.user.phone, order.orderNumber);
        break;
      case "SHIPPED":
        await sendShippingSMS(order.user.phone, order.orderNumber);
        break;
      case "DELIVERED":
        await sendDeliverySMS(order.user.phone, order.orderNumber);
        break;
      case "CANCELLED":
        await sendCancelledSMS(order.user.phone, order.orderNumber);
        break;
    }
  }
}
async function notifyCustomRequest(userId, requestId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, phone: true, pushTokens: true }
  });
  await createNotification({
    userId,
    title: "Demande sur-mesure recue",
    message: `Votre demande ${requestId} a ete prise en compte. Notre equipe vous contactera sous 24h.`,
    type: "CUSTOM",
    channel: "PUSH",
    data: { requestId, type: "custom" }
  });
  if (user?.phone) {
    await sendCustomRequestSMS(user.phone, requestId);
  }
  await notifyGerantsNewCustom(userId, requestId);
}
async function notifyGerantsNewCustom(userId, requestId) {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true, phone: true, pushTokens: true }
  });
  const request = await prisma.customRequest.findUnique({
    where: { id: requestId },
    select: { jewelryType: true }
  });
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true }
  });
  const customerName = user?.name || "Client";
  const jewelryType = request?.jewelryType || "Bijou";
  for (const admin2 of admins) {
    const title = "Nouvelle demande sur-mesure";
    const message = `Demande ${requestId} de ${customerName} \u2014 ${jewelryType}. Connectez-vous pour gerer.`;
    await createNotification({
      userId: admin2.id,
      title,
      message,
      type: "CUSTOM",
      channel: "PUSH",
      data: { requestId, type: "new_custom" }
    });
    if (admin2.phone) {
      await sendNewCustomToGerantSMS(admin2.phone, requestId, customerName, jewelryType);
    }
  }
}
async function notifyRepairRequest(userId, requestId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, phone: true, pushTokens: true }
  });
  await createNotification({
    userId,
    title: "Demande de reparation recue",
    message: `Votre demande ${requestId} a ete enregistree. Nous vous contacterons pour organiser le depot.`,
    type: "REPAIR",
    channel: "PUSH",
    data: { requestId, type: "repair" }
  });
  if (user?.phone) {
    await sendRepairRequestSMS(user.phone, requestId);
  }
  await notifyGerantsNewRepair(userId, requestId);
}
async function notifyGerantsNewRepair(userId, requestId) {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true, phone: true, pushTokens: true }
  });
  const request = await prisma.repairRequest.findUnique({
    where: { id: requestId },
    select: { jewelryType: true }
  });
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true }
  });
  const customerName = user?.name || "Client";
  const jewelryType = request?.jewelryType || "Bijou";
  for (const admin2 of admins) {
    const title = "Nouvelle demande de reparation";
    const message = `Demande ${requestId} de ${customerName} \u2014 ${jewelryType}. Connectez-vous pour gerer.`;
    await createNotification({
      userId: admin2.id,
      title,
      message,
      type: "REPAIR",
      channel: "PUSH",
      data: { requestId, type: "new_repair" }
    });
    if (admin2.phone) {
      await sendNewRepairToGerantSMS(admin2.phone, requestId, customerName, jewelryType);
    }
  }
}
async function notifyRepairStatusChange(requestId, status) {
  const request = await prisma.repairRequest.findUnique({
    where: { id: requestId },
    include: { user: { select: { id: true, phone: true, pushTokens: true } } }
  });
  if (!request || !request.user) return;
  const statusLabels = {
    RECUE: "Reparation recue",
    IN_PROGRESS: "En cours de traitement",
    WAITING_PARTS: "En attente de pieces",
    COMPLETED: "Reparation terminee",
    DELIVERED: "Bijou remis",
    CANCELLED: "Reparation annulee"
  };
  const title = statusLabels[status] || "Statut mis a jour";
  const body = `Votre reparation ${requestId}: ${statusLabels[status] || status}.`;
  await createNotification({
    userId: request.user.id,
    title,
    message: body,
    type: "REPAIR",
    channel: "PUSH",
    data: { requestId, status, type: "repair" }
  });
  if (request.user.phone) {
    await sendRepairStatusSMS(request.user.phone, requestId, status);
  }
}
async function notifyCustomStatusChange(requestId, status) {
  const request = await prisma.customRequest.findUnique({
    where: { id: requestId },
    include: { user: { select: { id: true, phone: true, pushTokens: true } } }
  });
  if (!request || !request.user) return;
  const statusLabels = {
    PENDING: "Demande en attente",
    IN_PROGRESS: "Etude en cours",
    QUOTE_SENT: "Devis envoye",
    APPROVED: "Demande approuvee",
    COMPLETED: "Bijou termine",
    CANCELLED: "Demande annulee"
  };
  const title = statusLabels[status] || "Statut mis a jour";
  const body = `Votre demande sur-mesure ${requestId}: ${statusLabels[status] || status}.`;
  await createNotification({
    userId: request.user.id,
    title,
    message: body,
    type: "CUSTOM",
    channel: "PUSH",
    data: { requestId, status, type: "custom" }
  });
  if (request.user.phone) {
    await sendCustomStatusSMS(request.user.phone, requestId, status);
  }
}
async function registerPushToken(userId, token) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { pushTokens: true }
  });
  const tokens = getPushTokens({ pushTokens: user?.pushTokens });
  if (!tokens.includes(token)) {
    tokens.push(token);
    await prisma.user.update({
      where: { id: userId },
      data: { pushTokens: JSON.stringify(tokens) }
    });
  }
}
async function unregisterPushToken(userId, token) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { pushTokens: true }
  });
  const tokens = getPushTokens({ pushTokens: user?.pushTokens }).filter((t) => t !== token);
  await prisma.user.update({
    where: { id: userId },
    data: { pushTokens: JSON.stringify(tokens) }
  });
}

// backend/routes/orders.ts
var router5 = (0, import_express5.Router)();
var VALID_STATUSES = ["CONFIRMED", "PREPARING", "SHIPPED", "DELIVERED", "CANCELLED"];
var ALLOWED_TRANSITIONS = {
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  // terminal state
  CANCELLED: []
  // terminal state
};
function canTransition(from, to) {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}
router5.get("/api/orders", authenticateToken, async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.userId },
      include: { items: true },
      orderBy: { createdAt: "desc" }
    });
    const parsed = orders.map((o) => ({
      ...o,
      shippingAddress: safeJsonParse(o.shippingAddress, null),
      statusHistory: safeJsonParse(o.statusHistory, [])
    }));
    res.json(parsed);
  } catch {
    res.status(500).json({ error: "Erreur lors du chargement des commandes" });
  }
});
router5.get("/api/orders/all", authenticateToken, requireAdmin, async (_req, res) => {
  try {
    const orders = await prisma.order.findMany({
      include: { items: true, user: { select: { name: true, identifier: true, phone: true } } },
      orderBy: { createdAt: "desc" }
    });
    const parsed = orders.map((o) => ({
      ...o,
      shippingAddress: safeJsonParse(o.shippingAddress, null),
      statusHistory: safeJsonParse(o.statusHistory, [])
    }));
    res.json(parsed);
  } catch {
    res.status(500).json({ error: "Erreur" });
  }
});
router5.get("/api/orders/:id", authenticateToken, async (req, res) => {
  try {
    const isAdmin = req.userRole === "ADMIN";
    const order = await prisma.order.findFirst({
      where: isAdmin ? { id: req.params.id } : { id: req.params.id, userId: req.userId },
      include: { items: true }
    });
    if (!order) return res.status(404).json({ error: "Commande non trouvee" });
    res.json({
      ...order,
      shippingAddress: safeJsonParse(order.shippingAddress, null),
      statusHistory: safeJsonParse(order.statusHistory, [])
    });
  } catch {
    res.status(500).json({ error: "Erreur" });
  }
});
router5.post("/api/orders", authenticateToken, rateLimit(10, 6e4), async (req, res) => {
  try {
    const { shippingAddress, cartItemIds } = req.body;
    const sanitizedAddress = shippingAddress ? {
      fullName: sanitizeString(shippingAddress.fullName),
      phone: sanitizeString(shippingAddress.phone),
      address: sanitizeString(shippingAddress.address),
      city: sanitizeString(shippingAddress.city),
      notes: sanitizeString(shippingAddress.notes)
    } : {};
    const cart = await prisma.cart.findUnique({
      where: { userId: req.userId },
      include: { items: { include: { product: true } } }
    });
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ error: "Panier vide" });
    }
    let itemsToOrder = cart.items;
    if (Array.isArray(cartItemIds) && cartItemIds.length > 0) {
      const idSet = new Set(cartItemIds);
      itemsToOrder = cart.items.filter((i) => idSet.has(i.id));
      if (itemsToOrder.length === 0) {
        return res.status(400).json({ error: "Aucun article selectionne trouve dans le panier" });
      }
      if (itemsToOrder.length !== cartItemIds.length) {
        return res.status(400).json({ error: "Certains articles selectionnes sont introuvables" });
      }
    }
    const { total } = await calculateCartTotal(
      cart,
      itemsToOrder
    );
    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    const order = await prisma.$transaction(async (tx) => {
      for (const item of itemsToOrder) {
        const result = await tx.$executeRaw`
          UPDATE product SET stockQuantity = stockQuantity - ${item.quantity}
          WHERE id = ${item.productId} AND stockQuantity >= ${item.quantity}
        `;
        if (result === 0) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
            select: { name: true, stockQuantity: true }
          });
          throw new Error(`"${product?.name || "Produit"}" n'a que ${product?.stockQuantity || 0} en stock`);
        }
      }
      const order2 = await tx.order.create({
        data: {
          orderNumber,
          userId: req.userId,
          customerName: sanitizedAddress.fullName || user?.name || "",
          phone: sanitizedAddress.phone || user?.phone || "",
          address: sanitizedAddress.address || "",
          totalAmount: total,
          shippingAddress: JSON.stringify(sanitizedAddress || {}),
          statusHistory: JSON.stringify([
            { status: "CONFIRMED", label: "Commande confirmee", date: (/* @__PURE__ */ new Date()).toISOString(), completed: true }
          ]),
          items: {
            create: itemsToOrder.map((item) => ({
              productId: item.productId,
              productName: item.product.name,
              productImage: safeJsonParse(item.product.images, [])[0] || "",
              price: item.product.price,
              quantity: item.quantity,
              selectedSize: item.selectedSize,
              selectedMaterial: item.selectedMaterial
            }))
          }
        },
        include: { items: true }
      });
      for (const item of itemsToOrder) {
        const updated = await tx.product.findUnique({
          where: { id: item.productId },
          select: { stockQuantity: true }
        });
        if (updated) {
          await tx.product.update({
            where: { id: item.productId },
            data: { inStock: updated.stockQuantity > 0 }
          });
        }
      }
      const orderedIds = itemsToOrder.map((i) => i.id);
      await tx.cartItem.deleteMany({ where: { cartId: cart.id, id: { in: orderedIds } } });
      return order2;
    });
    notifyNewOrder(order.id).catch(
      (err) => logger_default.error({ err, orderId: order.id }, "Failed to send new order notifications")
    );
    res.status(201).json(order);
  } catch (error) {
    if (error.message && error.message.includes("en stock")) {
      return res.status(400).json({ error: error.message });
    }
    logger_default.error({ err: error }, "Create order error");
    res.status(500).json({ error: "Erreur lors de la commande" });
  }
});
router5.put("/api/orders/:id/status", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: "Statut invalide" });
    }
    const existingOrder = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!existingOrder) return res.status(404).json({ error: "Commande non trouvee" });
    if (!canTransition(existingOrder.status, status)) {
      return res.status(400).json({
        error: `Transition invalide: ${existingOrder.status} -> ${status}`
      });
    }
    const currentHistory = safeJsonParse(existingOrder.statusHistory, []);
    const statusLabels = {
      CONFIRMED: "Commande confirmee",
      PREPARING: "En cours de fabrication",
      SHIPPED: "Expediee",
      DELIVERED: "Livree",
      CANCELLED: "Annulee"
    };
    const newEntry = {
      status,
      label: statusLabels[status] || status,
      date: (/* @__PURE__ */ new Date()).toISOString(),
      completed: true
    };
    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: {
        status,
        statusHistory: JSON.stringify([...currentHistory, newEntry])
      },
      include: { items: true }
    });
    if (status === "CANCELLED") {
      await prisma.$transaction(async (tx) => {
        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stockQuantity: { increment: item.quantity }, inStock: true }
          });
        }
      });
      logger_default.info({ orderId: order.id }, "Stock restored after cancellation");
    }
    await notifyOrderStatusChange(order.id, status);
    res.json({
      ...order,
      statusHistory: safeJsonParse(order.statusHistory, [])
    });
  } catch {
    res.status(500).json({ error: "Erreur lors de la mise a jour" });
  }
});
var orders_default = router5;

// backend/routes/favorites.ts
var import_express6 = require("express");
var router6 = (0, import_express6.Router)();
router6.get("/api/favorites", authenticateToken, async (req, res) => {
  try {
    const favorites = await prisma.favorite.findMany({
      where: { userId: req.userId },
      include: { product: { include: { category: true } } }
    });
    const products = favorites.map((f) => ({
      ...f.product,
      images: safeJsonParse(f.product.images, [])
    }));
    res.json(products);
  } catch {
    res.status(500).json({ error: "Erreur lors du chargement des favoris" });
  }
});
router6.post("/api/favorites/:productId", authenticateToken, async (req, res) => {
  try {
    const { productId } = req.params;
    const existing = await prisma.favorite.findUnique({
      where: { userId_productId: { userId: req.userId, productId } }
    });
    if (existing) {
      await prisma.favorite.delete({ where: { id: existing.id } });
    } else {
      await prisma.favorite.create({
        data: { userId: req.userId, productId }
      });
    }
    const allFavorites = await prisma.favorite.findMany({
      where: { userId: req.userId },
      select: { productId: true }
    });
    res.json({ favorites: allFavorites.map((f) => f.productId) });
  } catch {
    res.status(500).json({ error: "Erreur lors de la mise \xE0 jour des favoris" });
  }
});
var favorites_default = router6;

// backend/routes/notifications.ts
var import_express7 = require("express");
var router7 = (0, import_express7.Router)();
router7.get("/api/notifications", authenticateToken, async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: "desc" }
    });
    res.json(notifications);
  } catch {
    res.status(500).json({ error: "Erreur" });
  }
});
router7.patch("/api/notifications/:id/read", authenticateToken, async (req, res) => {
  try {
    const notification = await prisma.notification.findUnique({ where: { id: req.params.id } });
    if (!notification) return res.status(404).json({ error: "Notification non trouv\xE9e" });
    if (notification.userId !== req.userId) return res.status(403).json({ error: "Acc\xE8s refus\xE9" });
    await prisma.notification.update({
      where: { id: req.params.id },
      data: { read: true }
    });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Erreur" });
  }
});
router7.patch("/api/notifications/read-all", authenticateToken, async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.userId, read: false },
      data: { read: true }
    });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Erreur" });
  }
});
router7.delete("/api/notifications/:id", authenticateToken, async (req, res) => {
  try {
    const notification = await prisma.notification.findUnique({ where: { id: req.params.id } });
    if (!notification) return res.status(404).json({ error: "Notification non trouv\xE9e" });
    if (notification.userId !== req.userId) return res.status(403).json({ error: "Acc\xE8s refus\xE9" });
    await prisma.notification.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Erreur" });
  }
});
router7.post("/api/notifications", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId, title, message, type } = req.body;
    if (!userId || !title || !message) {
      return res.status(400).json({ error: "Utilisateur, titre et message requis" });
    }
    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type: type || "SYSTEM"
      }
    });
    res.status(201).json(notification);
  } catch {
    res.status(500).json({ error: "Erreur lors de l'envoi" });
  }
});
var notifications_default = router7;

// backend/routes/custom.ts
var import_express8 = require("express");
var router8 = (0, import_express8.Router)();
var VALID_CUSTOM_STATUSES = ["PENDING", "IN_PROGRESS", "QUOTE_SENT", "APPROVED", "COMPLETED", "CANCELLED"];
router8.get("/api/custom-requests", authenticateToken, async (req, res) => {
  try {
    const requests = await prisma.customRequest.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: "desc" }
    });
    res.json(requests);
  } catch {
    res.status(500).json({ error: "Erreur" });
  }
});
router8.get("/api/custom-requests/all", authenticateToken, requireAdmin, async (_req, res) => {
  try {
    const requests = await prisma.customRequest.findMany({
      include: { user: { select: { name: true, identifier: true, phone: true } } },
      orderBy: { createdAt: "desc" }
    });
    res.json(requests);
  } catch {
    res.status(500).json({ error: "Erreur" });
  }
});
router8.get("/api/custom-requests/:id", authenticateToken, async (req, res) => {
  try {
    const isAdmin = req.userRole === "ADMIN";
    const request = await prisma.customRequest.findFirst({
      where: isAdmin ? { id: req.params.id } : { id: req.params.id, userId: req.userId }
    });
    if (!request) return res.status(404).json({ error: "Demande non trouv\xE9e" });
    res.json(request);
  } catch {
    res.status(500).json({ error: "Erreur" });
  }
});
router8.post("/api/custom-requests", authenticateToken, async (req, res) => {
  try {
    const { jewelryType, material, description, budget, referenceImageUrl, phone } = req.body;
    if (!jewelryType || !description || !phone) {
      return res.status(400).json({ error: "Type de bijou, description et t\xE9l\xE9phone requis" });
    }
    const request = await prisma.customRequest.create({
      data: {
        userId: req.userId,
        jewelryType,
        material,
        description,
        budget: budget ? String(budget) : null,
        referenceImageUrl,
        phone
      }
    });
    await notifyCustomRequest(req.userId, request.id);
    res.status(201).json(request);
  } catch {
    res.status(500).json({ error: "Erreur lors de la cr\xE9ation" });
  }
});
router8.put("/api/custom-requests/:id/status", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!VALID_CUSTOM_STATUSES.includes(status)) {
      return res.status(400).json({ error: "Statut invalide" });
    }
    const request = await prisma.customRequest.update({
      where: { id: req.params.id },
      data: { status }
    });
    notifyCustomStatusChange(req.params.id, status).catch(
      (err) => logger_default.error({ err, requestId: req.params.id }, "Failed to send custom status notifications")
    );
    res.json(request);
  } catch {
    res.status(500).json({ error: "Erreur" });
  }
});
router8.delete("/api/custom-requests/:id", authenticateToken, async (req, res) => {
  try {
    const request = await prisma.customRequest.findUnique({ where: { id: req.params.id } });
    if (!request) return res.status(404).json({ error: "Demande non trouv\xE9e" });
    const isAdmin = req.userRole === "ADMIN";
    if (request.userId !== req.userId && !isAdmin) {
      return res.status(403).json({ error: "Acc\xE8s refus\xE9" });
    }
    await prisma.customRequest.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Erreur" });
  }
});
var custom_default = router8;

// backend/routes/repairs.ts
var import_express9 = require("express");
var router9 = (0, import_express9.Router)();
var VALID_REPAIR_STATUSES = ["RECEIVED", "IN_PROGRESS", "WAITING_PARTS", "COMPLETED", "DELIVERED", "CANCELLED"];
router9.get("/api/repairs", authenticateToken, async (req, res) => {
  try {
    const repairs = await prisma.repairRequest.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: "desc" }
    });
    const parsed = repairs.map((r) => ({
      ...r,
      photos: safeJsonParse(r.photos, [])
    }));
    res.json(parsed);
  } catch {
    res.status(500).json({ error: "Erreur" });
  }
});
router9.get("/api/repairs/all", authenticateToken, requireAdmin, async (_req, res) => {
  try {
    const repairs = await prisma.repairRequest.findMany({
      include: { user: { select: { name: true, identifier: true, phone: true } } },
      orderBy: { createdAt: "desc" }
    });
    const parsed = repairs.map((r) => ({
      ...r,
      photos: safeJsonParse(r.photos, [])
    }));
    res.json(parsed);
  } catch {
    res.status(500).json({ error: "Erreur" });
  }
});
router9.get("/api/repairs/:id", authenticateToken, async (req, res) => {
  try {
    const isAdmin = req.userRole === "ADMIN";
    const repair = await prisma.repairRequest.findFirst({
      where: isAdmin ? { id: req.params.id } : { id: req.params.id, userId: req.userId }
    });
    if (!repair) return res.status(404).json({ error: "Demande non trouv\xE9e" });
    res.json({ ...repair, photos: safeJsonParse(repair.photos, []) });
  } catch {
    res.status(500).json({ error: "Erreur" });
  }
});
router9.post("/api/repairs", authenticateToken, async (req, res) => {
  try {
    const { jewelryType, problemType, description, photos, phone } = req.body;
    if (!jewelryType || !problemType || !phone) {
      return res.status(400).json({ error: "Type de bijou, probl\xE8me et t\xE9l\xE9phone requis" });
    }
    const repair = await prisma.repairRequest.create({
      data: {
        userId: req.userId,
        jewelryType,
        problemType,
        description: description || "",
        photos: photos ? JSON.stringify(photos) : null,
        phone
      }
    });
    await notifyRepairRequest(req.userId, repair.id);
    res.status(201).json(repair);
  } catch {
    res.status(500).json({ error: "Erreur" });
  }
});
router9.put("/api/repairs/:id/status", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!VALID_REPAIR_STATUSES.includes(status)) {
      return res.status(400).json({ error: "Statut invalide" });
    }
    const repair = await prisma.repairRequest.update({
      where: { id: req.params.id },
      data: { status }
    });
    notifyRepairStatusChange(req.params.id, status).catch(
      (err) => logger_default.error({ err, requestId: req.params.id }, "Failed to send repair status notifications")
    );
    res.json(repair);
  } catch {
    res.status(500).json({ error: "Erreur" });
  }
});
router9.delete("/api/repairs/:id", authenticateToken, async (req, res) => {
  try {
    const repair = await prisma.repairRequest.findUnique({ where: { id: req.params.id } });
    if (!repair) return res.status(404).json({ error: "Demande non trouv\xE9e" });
    const isAdmin = req.userRole === "ADMIN";
    if (repair.userId !== req.userId && !isAdmin) {
      return res.status(403).json({ error: "Acc\xE8s refus\xE9" });
    }
    await prisma.repairRequest.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Erreur" });
  }
});
var repairs_default = router9;

// backend/routes/admin.ts
var import_express10 = require("express");
var import_bcryptjs2 = __toESM(require("bcryptjs"), 1);
var router10 = (0, import_express10.Router)();
var GERANT_IDENTIFIER2 = process.env.GERANT_IDENTIFIER || "gerantSatoubaBijouterie6002";
router10.get("/api/customers", authenticateToken, requireAdmin, async (_req, res) => {
  try {
    const customers = await prisma.user.findMany({
      where: { role: "CUSTOMER" },
      select: {
        id: true,
        name: true,
        identifier: true,
        phone: true,
        orders: {
          select: { totalAmount: true }
        }
      }
    });
    const result = customers.map((c) => ({
      id: c.id,
      name: c.name,
      identifier: c.identifier,
      phone: c.phone,
      totalSpent: c.orders.reduce((acc, o) => acc + o.totalAmount, 0),
      ordersCount: c.orders.length
    }));
    res.json(result);
  } catch {
    res.status(500).json({ error: "Erreur" });
  }
});
router10.get("/api/users", authenticateToken, requireAdmin, async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        identifier: true,
        phone: true,
        role: true,
        createdAt: true,
        _count: {
          select: { orders: true, favorites: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });
    const result = users.map((u) => ({
      id: u.id,
      name: u.name,
      identifier: u.identifier,
      phone: u.phone,
      role: u.role,
      createdAt: u.createdAt,
      ordersCount: u._count.orders,
      favoritesCount: u._count.favorites
    }));
    res.json(result);
  } catch {
    res.status(500).json({ error: "Erreur" });
  }
});
router10.post("/api/users", authenticateToken, requireAdmin, rateLimit(10, 6e4), async (req, res) => {
  try {
    const { name, identifier, password, phone, role = "ARTISAN" } = req.body;
    if (!name || !identifier || !password) {
      return res.status(400).json({ error: "Nom, identifiant et mot de passe requis" });
    }
    const sanitizedName = sanitizeString(name);
    if (sanitizedName.length < 2) {
      return res.status(400).json({ error: "Le nom doit contenir au moins 2 caracteres" });
    }
    if (phone && !isValidPhone(phone)) {
      return res.status(400).json({ error: "Numero de telephone invalide" });
    }
    if (!["ADMIN", "ARTISAN"].includes(role)) {
      return res.status(400).json({ error: "R\xF4le invalide (ADMIN ou ARTISAN uniquement)" });
    }
    if (role === "ADMIN") {
      const currentUser = await prisma.user.findUnique({ where: { id: req.userId }, select: { identifier: true } });
      if (currentUser?.identifier !== GERANT_IDENTIFIER2) {
        return res.status(403).json({ error: "Seul le g\xE9rant principal peut cr\xE9er des administrateurs" });
      }
    }
    if (typeof password !== "string" || password.length < 8) {
      return res.status(400).json({ error: "Le mot de passe doit contenir au moins 8 caract\xE8res" });
    }
    const existing = await prisma.user.findUnique({ where: { identifier: identifier.toLowerCase() } });
    if (existing) {
      return res.status(400).json({ error: "Un compte existe d\xE9j\xE0 avec cet identifiant" });
    }
    const hashedPassword = await import_bcryptjs2.default.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        name: sanitizedName,
        identifier: identifier.toLowerCase().trim(),
        password: hashedPassword,
        phone: phone || null,
        role
      },
      select: { id: true, name: true, identifier: true, phone: true, role: true, createdAt: true }
    });
    await prisma.cart.create({ data: { userId: user.id } });
    res.status(201).json(user);
  } catch {
    res.status(500).json({ error: "Erreur lors de la cr\xE9ation" });
  }
});
router10.put("/api/users/:id/role", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    if (!["CUSTOMER", "ADMIN", "ARTISAN"].includes(role)) {
      return res.status(400).json({ error: "R\xF4le invalide" });
    }
    if (req.params.id === req.userId) {
      return res.status(400).json({ error: "Vous ne pouvez pas modifier votre propre r\xF4le" });
    }
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { role },
      select: { id: true, name: true, identifier: true, role: true }
    });
    res.json(user);
  } catch {
    res.status(500).json({ error: "Erreur" });
  }
});
router10.delete("/api/users/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    if (req.params.id === req.userId) {
      return res.status(400).json({ error: "Vous ne pouvez pas supprimer votre propre compte" });
    }
    const targetUser = await prisma.user.findUnique({ where: { id: req.params.id }, select: { role: true } });
    if (!targetUser) return res.status(404).json({ error: "Utilisateur non trouv\xE9" });
    if (targetUser.role === "ADMIN") {
      return res.status(400).json({ error: "Impossible de supprimer un autre administrateur" });
    }
    const activeOrders = await prisma.order.count({
      where: { userId: req.params.id, status: { notIn: ["DELIVERED", "CANCELLED"] } }
    });
    if (activeOrders > 0) {
      return res.status(400).json({ error: "Cet utilisateur a des commandes actives et ne peut pas \xEAtre supprim\xE9" });
    }
    await prisma.$transaction(async (tx) => {
      await tx.notification.deleteMany({ where: { userId: req.params.id } });
      await tx.like.deleteMany({ where: { userId: req.params.id } });
      await tx.favorite.deleteMany({ where: { userId: req.params.id } });
      await tx.customRequest.deleteMany({ where: { userId: req.params.id } });
      await tx.repairRequest.deleteMany({ where: { userId: req.params.id } });
      await tx.orderItem.deleteMany({ where: { order: { userId: req.params.id } } });
      await tx.order.deleteMany({ where: { userId: req.params.id } });
      await tx.cartItem.deleteMany({ where: { cart: { userId: req.params.id } } });
      await tx.cart.deleteMany({ where: { userId: req.params.id } });
      await tx.passwordResetToken.deleteMany({ where: { userId: req.params.id } });
      await tx.user.delete({ where: { id: req.params.id } });
    });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Erreur" });
  }
});
router10.get("/api/admin/stats", authenticateToken, requireAdmin, async (_req, res) => {
  try {
    const [totalRevenue, totalOrders, totalProducts, totalCustomers, pendingCustom, pendingRepairs] = await Promise.all([
      prisma.order.aggregate({ _sum: { totalAmount: true } }),
      prisma.order.count(),
      prisma.product.count(),
      prisma.user.count({ where: { role: "CUSTOMER" } }),
      prisma.customRequest.count({ where: { status: "PENDING" } }),
      prisma.repairRequest.count({ where: { status: "RECEIVED" } })
    ]);
    res.json({
      totalRevenue: totalRevenue._sum.totalAmount || 0,
      totalOrders,
      totalProducts,
      totalCustomers,
      pendingCustom,
      pendingRepairs
    });
  } catch {
    res.status(500).json({ error: "Erreur" });
  }
});
var admin_default = router10;

// backend/routes/public.ts
var import_express11 = require("express");
var router11 = (0, import_express11.Router)();
router11.get("/api/stats/public", async (_req, res) => {
  try {
    const [totalCustomers, totalProducts] = await Promise.all([
      prisma.user.count({ where: { role: "CUSTOMER" } }),
      prisma.product.count()
    ]);
    res.json({
      totalCustomers,
      totalProducts
    });
  } catch {
    res.status(500).json({ error: "Erreur" });
  }
});
var public_default = router11;

// backend/routes/settings.ts
var import_express12 = require("express");
var router12 = (0, import_express12.Router)();
router12.get("/api/store-settings", async (_req, res) => {
  try {
    const settings = await prisma.storeSettings.findMany();
    const result = {};
    settings.forEach((s) => {
      result[s.key] = s.value;
    });
    res.json(result);
  } catch {
    res.status(500).json({ error: "Erreur" });
  }
});
router12.put("/api/store-settings", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const updates = req.body;
    for (const [key, value] of Object.entries(updates)) {
      await prisma.storeSettings.upsert({
        where: { key },
        update: { value },
        create: { key, value }
      });
    }
    const settings = await prisma.storeSettings.findMany();
    const result = {};
    settings.forEach((s) => {
      result[s.key] = s.value;
    });
    res.json(result);
  } catch {
    res.status(500).json({ error: "Erreur" });
  }
});
var settings_default = router12;

// backend/routes/upload.ts
var import_express13 = require("express");
var import_multer = __toESM(require("multer"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_url = require("url");
var import_uuid = require("uuid");
var import_client2 = require("@vercel/blob/client");
var import_meta = {};
var router13 = (0, import_express13.Router)();
var hasBlobToken = !!process.env.BLOB_READ_WRITE_TOKEN;
router13.post("/api/upload/handle", authenticateToken, requireAdmin, async (req, res) => {
  if (!hasBlobToken) {
    return res.status(400).json({ error: "Vercel Blob n\u2019est pas configur\xE9 (BLOB_READ_WRITE_TOKEN manquant)" });
  }
  try {
    const body = await req.body;
    const jsonResponse = await (0, import_client2.handleUpload)({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => ({
        allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
        maximumSizeInBytes: 5 * 1024 * 1024,
        addRandomSuffix: true,
        // L'admin est déjà validé par le middleware requireAdmin ci-dessus.
        ...pathname ? {} : {}
      }),
      onUploadCompleted: async () => {
      }
    });
    return res.json(jsonResponse);
  } catch (error) {
    console.error("Blob handleUpload error:", error);
    return res.status(500).json({ error: error.message || "Erreur g\xE9n\xE9ration token upload" });
  }
});
function getUploadsDir() {
  if (process.env.UPLOADS_DIR) return process.env.UPLOADS_DIR;
  let baseDir;
  try {
    baseDir = import_path.default.dirname((0, import_url.fileURLToPath)(import_meta.url));
  } catch {
    baseDir = process.cwd();
  }
  const candidates = [
    import_path.default.join(process.cwd(), "backend", "uploads"),
    import_path.default.join(process.cwd(), "uploads"),
    import_path.default.join(baseDir, "..", "uploads"),
    import_path.default.join(baseDir, "uploads")
  ];
  for (const dir of candidates) {
    if (import_fs.default.existsSync(dir)) return dir;
  }
  return candidates[0];
}
var uploadsDir = getUploadsDir();
if (!import_fs.default.existsSync(uploadsDir)) {
  import_fs.default.mkdirSync(uploadsDir, { recursive: true });
}
var storage = import_multer.default.diskStorage({
  destination: uploadsDir,
  filename: (_req, file, cb) => {
    const ext = import_path.default.extname(file.originalname).toLowerCase();
    cb(null, `${(0, import_uuid.v4)()}${ext}`);
  }
});
var upload = (0, import_multer.default)({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  // 5 MB
  fileFilter: (_req, file, cb) => {
    const allowed = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
    const ext = import_path.default.extname(file.originalname).toLowerCase();
    const mimeOk = ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.mimetype);
    if (allowed.includes(ext) && mimeOk) {
      cb(null, true);
    } else {
      cb(new Error("Format de fichier non support\xE9. Utilisez JPG, PNG ou WebP."));
    }
  }
});
router13.post("/api/upload", authenticateToken, requireAdmin, (req, res) => {
  upload.single("image")(req, res, (err) => {
    if (err instanceof import_multer.default.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ error: "Le fichier ne doit pas d\xE9passer 5 Mo." });
      }
      return res.status(400).json({ error: err.message });
    }
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: "Aucun fichier envoy\xE9." });
    }
    const url = `/uploads/${req.file.filename}`;
    res.json({ url, filename: req.file.filename });
  });
});
router13.post("/api/upload/multiple", authenticateToken, requireAdmin, (req, res) => {
  upload.array("images", 5)(req, res, (err) => {
    if (err instanceof import_multer.default.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ error: "Chaque fichier ne doit pas d\xE9passer 5 Mo." });
      }
      if (err.code === "LIMIT_UNEXPECTED_FILE") {
        return res.status(400).json({ error: "Maximum 5 images \xE0 la fois." });
      }
      return res.status(400).json({ error: err.message });
    }
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "Aucun fichier envoy\xE9." });
    }
    const urls = req.files.map((f) => `/uploads/${f.filename}`);
    res.json({ urls });
  });
});
var upload_default = router13;

// backend/routes/push.ts
var import_express14 = require("express");
var router14 = (0, import_express14.Router)();
router14.post("/api/push/register", authenticateToken, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: "Token FCM requis" });
    }
    await registerPushToken(req.userId, token);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Erreur enregistrement token" });
  }
});
router14.delete("/api/push/register", authenticateToken, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: "Token FCM requis" });
    }
    await unregisterPushToken(req.userId, token);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Erreur suppression token" });
  }
});
router14.post("/api/push/unregister", authenticateToken, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: "Token FCM requis" });
    }
    await unregisterPushToken(req.userId, token);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Erreur suppression token" });
  }
});
var push_default = router14;

// backend/routes/health.ts
var import_express15 = require("express");
var router15 = (0, import_express15.Router)();
router15.get("/api/health", async (_req, res) => {
  const checks = {};
  let healthy = true;
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = "ok";
  } catch (e) {
    checks.database = `error: ${e.message?.slice(0, 100) || "unknown"}`;
    healthy = false;
  }
  const mem = process.memoryUsage();
  const heapUsedMB = Math.round(mem.heapUsed / 1024 / 1024);
  checks.memory = `${heapUsedMB}MB`;
  if (heapUsedMB > 400) checks.memory += " (high)";
  const uptime = Math.round(process.uptime());
  res.status(healthy ? 200 : 503).json({
    status: healthy ? "healthy" : "degraded",
    version: process.env.npm_package_version || "1.0.0",
    uptime: `${uptime}s`,
    checks,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
router15.get("/api/health/live", (_req, res) => {
  res.json({ status: "alive", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
});
var health_default = router15;

// backend/app.ts
var import_meta2 = {};
var app = (0, import_express16.default)();
var __filename;
var __dirname;
try {
  __filename = (0, import_url2.fileURLToPath)(import_meta2.url);
  __dirname = import_path2.default.dirname(__filename);
} catch {
  try {
    const require2 = (0, import_module.createRequire)(import_meta2.url);
    __filename = require2("url").fileURLToPath(import_meta2.url);
    __dirname = import_path2.default.dirname(__filename);
  } catch {
    __filename = process.cwd();
    __dirname = process.cwd();
  }
}
setupSecurity(app);
if (process.env.NODE_ENV !== "test") {
  app.use((0, import_pino_http.default)({
    logger: logger_default,
    autoLogging: {
      ignore: (req) => req.url === "/api/health"
    }
  }));
}
var rawOrigins = process.env.CORS_ORIGIN || process.env.APP_URL || "http://localhost:5173";
var allowedOrigins = rawOrigins.split(",").map((s) => s.trim()).filter(Boolean);
app.use((0, import_cors.default)({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
      return callback(null, true);
    }
    if (process.env.NODE_ENV !== "production" && origin.startsWith("http://localhost")) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  maxAge: 86400
}));
app.use(import_express16.default.json({ limit: "1mb" }));
app.use(import_express16.default.urlencoded({ extended: true, limit: "1mb" }));
function resolveUploadsDir() {
  if (process.env.UPLOADS_DIR) return process.env.UPLOADS_DIR;
  const cwdBackend = import_path2.default.join(process.cwd(), "backend", "uploads");
  const sibling = import_path2.default.join(__dirname, "uploads");
  return import_fs2.default.existsSync(cwdBackend) ? cwdBackend : import_fs2.default.existsSync(sibling) ? sibling : cwdBackend;
}
var uploadsDir2 = resolveUploadsDir();
if (!import_fs2.default.existsSync(uploadsDir2)) {
  import_fs2.default.mkdirSync(uploadsDir2, { recursive: true });
}
app.use("/uploads", import_express16.default.static(uploadsDir2, {
  maxAge: "1y",
  etag: true
}));
app.use(health_default);
app.use(auth_default);
app.use(categories_default);
app.use(products_default);
app.use(cart_default);
app.use(orders_default);
app.use(favorites_default);
app.use(notifications_default);
app.use(custom_default);
app.use(repairs_default);
app.use(admin_default);
app.use(public_default);
app.use(settings_default);
app.use(upload_default);
app.use(push_default);
app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "Route non trouv\xE9e" });
  }
  next();
});
app.use((err, req, res, _next) => {
  if (err.message && err.message.startsWith("CORS blocked")) {
    return res.status(403).json({ error: "Origine non autoris\xE9e" });
  }
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "JSON invalide" });
  }
  if (err.type === "entity.too.large") {
    return res.status(413).json({ error: "Payload trop volumineux" });
  }
  if (req.path.startsWith("/api/")) {
    console.error("Unhandled error:", err);
    const message = process.env.NODE_ENV === "production" ? "Erreur interne du serveur" : err.message || "Erreur interne du serveur";
    return res.status(err.status || 500).json({ error: message });
  }
  _next(err);
});
var app_default = app;

// api/_index.ts
var index_default = app_default;
//# sourceMappingURL=index.js.map
