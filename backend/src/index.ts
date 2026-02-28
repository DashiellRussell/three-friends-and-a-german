import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import { errorHandler } from "./middleware/errorHandler";
import checkin from "./routes/checkin";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:3000" }));
app.use(express.json());

// Routes
app.use("/api/checkin", checkin);

// Health check
app.get("/ping", (_req, res) => {
  res.json({ status: "ok" });
});

// Global error handler (must be last)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
