import dotenv from "dotenv";
import path from "path";
import fs from "fs";

// Resolve monorepo root (works whether cwd is root or backend/)
function findRoot(): string {
  const cwd = process.cwd();
  if (fs.existsSync(path.join(cwd, "backend", "app.ts"))) return cwd;
  if (fs.existsSync(path.join(cwd, "app.ts"))) return path.resolve(cwd, "..");
  return cwd;
}
const ROOT = findRoot();

// Load .env first, then .env.local (local always wins in dev)
const envFile = path.join(ROOT, ".env");
if (fs.existsSync(envFile)) dotenv.config({ path: envFile });
const envLocal = path.join(ROOT, ".env.local");
if (fs.existsSync(envLocal)) dotenv.config({ path: envLocal, override: true });

import express from "express";
import cors from "cors";
import backendApp from "./app.ts";

const app = express();
const PORT = Number(process.env.PORT) || 3002;
const NODE_ENV = process.env.NODE_ENV || "development";

// CORS — autoriser les 2 frontends en dev
app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:4173",
    "http://localhost:4174",
  ],
  credentials: true,
}));

// API routes
app.use(backendApp);

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`SaTouba API [${NODE_ENV}] running on http://localhost:${PORT}`);
});

const shutdown = (signal: string) => {
  console.log(`Received ${signal}, shutting down...`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000).unref();
};
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("unhandledRejection", (reason) => console.error("Unhandled Rejection:", reason));
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  if (NODE_ENV === "production") shutdown("uncaughtException");
});