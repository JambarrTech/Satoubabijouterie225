import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';

const logger = pino({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  // Disable pino-pretty transport entirely in bundled/serverless environments
  // (worker-thread transport doesn't survive esbuild bundling)
  transport: undefined,
  // Redact sensitive fields
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', 'password', 'token', 'JWT_SECRET', 'AFRICASTALKING_API_KEY'],
    censor: '[REDACTED]',
  },
  base: {
    env: process.env.NODE_ENV,
    version: process.env.npm_package_version,
  },
});

export default logger;
