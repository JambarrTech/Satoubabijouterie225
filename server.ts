import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import backendApp from "./backend/server.ts";
import { assertWaveConfigured } from "./backend/lib/payments.ts";

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const NODE_ENV = process.env.NODE_ENV || 'development';

  // Vérifie la config paiement Wave AVANT d'accepter des commandes.
  // En production, refuse de démarrer si PAYMENTS_MOCK=true ou si aucune clé Wave réelle.
  if (!assertWaveConfigured()) {
    process.exit(1);
  }

  // Mount backend API routes from /backend/server.ts
  app.use(backendApp);

  // Vite middleware for development or static serving for production
  if (NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, { maxAge: '1y', etag: true, index: false }));
    // SPA fallback — but don't intercept /api/* (already handled) or /uploads/*
    app.get('*all', (req, res, next) => {
      if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
        return next();
      }
      res.sendFile(path.join(distPath, 'index.html'), (err) => {
        if (err) next(err);
      });
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`SaTouba Bijouterie [${NODE_ENV}] running on http://localhost:${PORT}`);
  });

  // Graceful shutdown (important for Cloud Run / Docker)
  const shutdown = (signal: string) => {
    console.log(`Received ${signal}, shutting down gracefully...`);
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
    // Force close after 10s
    setTimeout(() => {
      console.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Handle uncaught errors without crashing silently
  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection:', reason);
  });
  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    // In production, let orchestrator restart; in dev, keep alive
    if (NODE_ENV === 'production') {
      shutdown('uncaughtException');
    }
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
