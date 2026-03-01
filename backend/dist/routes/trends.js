"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const supabase_1 = require("../services/supabase");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.requireAuth);
router.get("/", async (req, res) => {
    const userId = req.userId;
    const rangeParam = req.query.range || "week";
    let days = 7;
    if (rangeParam === "2weeks")
        days = 14;
    if (rangeParam === "month")
        days = 30;
    try {
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - days + 1);
        pastDate.setHours(0, 0, 0, 0);
        const { data: checkinsData, error } = await supabase_1.supabase
            .from("check_ins")
            .select("created_at, energy, sleep_hours")
            .eq("user_id", userId)
            .gte("created_at", pastDate.toISOString())
            .order("created_at", { ascending: true });
        if (error)
            throw error;
        const checkins = checkinsData || [];
        const grouped = {};
        for (const c of checkins) {
            const dateStr = new Date(c.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
            grouped[dateStr] = c;
        }
        const result = [];
        for (let i = days - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
            const c = grouped[dateStr];
            result.push({
                date: dateStr,
                energy: c ? c.energy : null,
                sleep: c ? c.sleep_hours : null
            });
        }
        res.json(result);
    }
    catch (error) {
        console.error("Trends error:", error);
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
