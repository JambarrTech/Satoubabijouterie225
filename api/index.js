// Serverless function entry point for Vercel
// The backend/app.ts is compiled to backend/app.cjs by esbuild during `assemble-vercel.mjs`
// This file re-exports the Express app so Vercel can run it as a serverless function
import backendApp from "../backend/app.cjs";
export default backendApp;
