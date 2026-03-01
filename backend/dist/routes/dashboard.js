"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const supabase_1 = require("../services/supabase");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.requireAuth);
router.get("/", async (req, res) => {
    const userId = req.userId;
    try {
        // 1. Get check-ins for sparkline, energy avg and last entry
        const { data: checkinsData, error: checkinsError } = await supabase_1.supabase
            .from("check_ins")
            .select("*, symptoms(id)")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(7);
        if (checkinsError)
            throw checkinsError;
        const checkins = checkinsData || [];
        const last7 = [...checkins].reverse().map(c => {
            const d = new Date(c.created_at);
            return {
                id: c.id,
                energy: c.energy || 0,
                date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
            };
        });
        const energyAvg = checkins.length
            ? checkins.reduce((s, c) => s + (c.energy || 0), 0) / checkins.length
            : 0;
        // 2. Adherence (past 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const { count: adherenceCount, error: adherenceError } = await supabase_1.supabase
            .from("check_ins")
            .select("*", { count: 'exact', head: true })
            .eq("user_id", userId)
            .gte("created_at", thirtyDaysAgo.toISOString());
        if (adherenceError)
            throw adherenceError;
        const adherence = Math.min(Math.round(((adherenceCount || 0) / 30) * 100), 100);
        // 3. Streak (simple approximation: number of checkins in last 7 days)
        const streak = checkins.length;
        // 4. Latest entry
        const latestRaw = checkins.length > 0 ? checkins[0] : null;
        let latest_entry = null;
        if (latestRaw) {
            const d = new Date(latestRaw.created_at);
            latest_entry = {
                summary: latestRaw.summary || "Latest check-in",
                timeLabel: d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
                mood: latestRaw.mood || "Neutral",
                symptom_count: latestRaw.symptoms?.length || 0
            };
        }
        res.json({
            last7,
            energy_avg: Math.round(energyAvg * 10) / 10,
            adherence,
            streak,
            latest_entry
        });
    }
    catch (error) {
        console.error("Dashboard error:", error);
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
