"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
const supabase_1 = require("../services/supabase");
/**
 * Auth middleware — extracts user from Supabase JWT.
 * For dev/testing, also accepts x-user-id header as fallback.
 */
async function requireAuth(req, res, next) {
    // Dev shortcut: x-user-id or uuid header
    const devUserId = (req.headers["x-user-id"] || req.headers["uuid"]);
    if (devUserId) {
        req.userId = devUserId;
        return next();
    }
    // Production: Bearer token from Supabase auth
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
        res.status(401).json({ error: "Missing authorization header" });
        return;
    }
    const token = authHeader.slice(7);
    const { data: { user }, error, } = await supabase_1.supabase.auth.getUser(token);
    if (error || !user) {
        res.status(401).json({ error: "Invalid or expired token" });
        return;
    }
    req.userId = user.id;
    next();
}
