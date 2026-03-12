import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { clerkMiddleware } from "@clerk/express";

import { errorHandler } from "./middleware/errorHandler";
import { supabase } from "./services/supabase";
import profiles from "./routes/profiles";
import checkins from "./routes/checkin";
import symptoms from "./routes/symptoms";
import documents from "./routes/documents";
import reports from "./routes/reports";
import voice from "./routes/voice";
import dashboard from "./routes/dashboard";
import medications from "./routes/medications";
import trends from "./routes/trends";
import waitlist from "./routes/waitlist";

// Validate required environment variables at startup (fail fast)
const REQUIRED_ENV_VARS = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "MISTRAL_API_KEY",
  "ELEVENLABS_API_KEY",
];
const missingVars = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
if (missingVars.length > 0) {
  console.error(`Missing required environment variables: ${missingVars.join(", ")}`);
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true, legacyHeaders: false }));
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:3000", credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(clerkMiddleware());

// Routes
app.use("/api/profiles", profiles);
app.use("/api/checkin", checkins);
app.use("/api/symptoms", symptoms);
app.use("/api/documents", documents);
app.use("/api/reports", reports);
app.use("/api/voice", voice);
app.use("/api/dashboard", dashboard);
app.use("/api/medications", medications);
app.use("/api/trends", trends);
app.use("/api/waitlist", waitlist);

// Liveness check
app.get("/ping", (_req, res) => {
  res.json({ status: "ok" });
});

// Readiness check (verifies DB connectivity)
app.get("/health", async (_req, res) => {
  try {
    const { error } = await supabase.from("profiles").select("id").limit(1);
    if (error) throw error;
    res.json({ status: "ready", db: "connected" });
  } catch (err) {
    res.status(503).json({ status: "not ready", db: "disconnected", error: (err as Error).message });
  }
});

// Global error handler (must be last)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
