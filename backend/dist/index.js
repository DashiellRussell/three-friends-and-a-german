"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const errorHandler_1 = require("./middleware/errorHandler");
const profiles_1 = __importDefault(require("./routes/profiles"));
const checkin_1 = __importDefault(require("./routes/checkin"));
const symptoms_1 = __importDefault(require("./routes/symptoms"));
const documents_1 = __importDefault(require("./routes/documents"));
const reports_1 = __importDefault(require("./routes/reports"));
const voice_1 = __importDefault(require("./routes/voice"));
const dashboard_1 = __importDefault(require("./routes/dashboard"));
const trends_1 = __importDefault(require("./routes/trends"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// Middleware
app.use((0, cors_1.default)({ origin: process.env.FRONTEND_URL || "http://localhost:3000" }));
app.use(express_1.default.json());
// Routes
app.use("/api/profiles", profiles_1.default);
app.use("/api/checkin", checkin_1.default);
app.use("/api/symptoms", symptoms_1.default);
app.use("/api/documents", documents_1.default);
app.use("/api/reports", reports_1.default);
app.use("/api/voice", voice_1.default);
app.use("/api/dashboard", dashboard_1.default);
app.use("/api/trends", trends_1.default);
// Health check
app.get("/ping", (_req, res) => {
    res.json({ status: "ok" });
});
// Global error handler (must be last)
app.use(errorHandler_1.errorHandler);
app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
});
