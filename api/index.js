// Serverless function entry point for Vercel
// The backend/app.ts is compiled to backend/app.js by esbuild during `assemble-vercel.mjs`
// This file re-exports the Express app so Vercel can run it as a serverless function
const backendApp = require("../backend/app.js");
module.exports = backendApp.default || backendApp;
