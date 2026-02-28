import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";

import { errorHandler } from "./middleware/errorHandler";
import profiles from "./routes/profiles";
import checkins from "./routes/checkin";
import symptoms from "./routes/symptoms";
import documents from "./routes/documents";
import reports from "./routes/reports";
import voice from "./routes/voice";
import patterns from "./routes/patterns";

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:3000" }));
app.use(express.json());

// Routes
app.use("/api/profiles", profiles);
app.use("/api/checkin", checkins);
app.use("/api/symptoms", symptoms);
app.use("/api/documents", documents);
app.use("/api/reports", reports);
app.use("/api/voice", voice);
app.use("/api/patterns", patterns);

// Health check
app.get("/ping", (_req, res) => {
  res.json({ status: "ok" });
});

// Global error handler (must be last)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
