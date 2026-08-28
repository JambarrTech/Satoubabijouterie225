import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  // pino-pretty only in development; JSON logs in production for Cloud Run / ELK
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard' } }
    : undefined,
  // Redact sensitive fields
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', 'password', 'token', 'FIREBASE_PRIVATE_KEY', 'JWT_SECRET', 'WAVE_API_KEY', 'ORANGE_MONEY_API_KEY', 'SMTP_PASS', 'AFRICASTALKING_API_KEY'],
    censor: '[REDACTED]',
  },
  base: {
    env: process.env.NODE_ENV,
    version: process.env.npm_package_version,
  },
});

export default logger;
