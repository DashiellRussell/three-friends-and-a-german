import { Router, Request, Response } from "express";
import { supabase } from "../services/supabase";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

router.get("/", async (req: Request, res: Response) => {
    const userId = req.userId!;
    try {
        // 1. Get check-ins for sparkline, energy avg and last entry
        const { data: checkinsData, error: checkinsError } = await supabase
            .from("check_ins")
            .select("*, symptoms(id)")
            .eq("user_id", userId)
            .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
            .order("created_at", { ascending: false });

        if (checkinsError) throw checkinsError;

        const checkins = checkinsData || [];

        const groupedLast7: Record<string, any> = {};
        for (const c of checkins) {
            const dateStr = new Date(c.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
            if (!groupedLast7[dateStr]) groupedLast7[dateStr] = c;
        }

        const last7 = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

            const c = groupedLast7[dateStr];
            last7.push({
                id: c ? c.id : null,
                energy: c ? c.energy : null,
                date: dateStr
            });
        }

        const energyAvg = checkins.length
            ? checkins.reduce((s, c) => s + (c.energy || 0), 0) / checkins.length
            : 0;

        // 2. Adherence (past 30 days) — medication-based if user has meds, otherwise check-in-based
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const thirtyDaysAgoDate = thirtyDaysAgo.toISOString().split("T")[0];

        let adherence = 0;

        // Try medication-based adherence first, fall back to check-in count
        try {
            const { count: medCount } = await supabase
                .from("medications")
                .select("*", { count: "exact", head: true })
                .eq("user_id", userId)
                .eq("active", true);

            if (medCount && medCount > 0) {
                const { count: takenCount } = await supabase
                    .from("medication_logs")
                    .select("*", { count: "exact", head: true })
                    .eq("user_id", userId)
                    .eq("taken", true)
                    .gte("scheduled_date", thirtyDaysAgoDate);

                adherence = Math.min(Math.round(((takenCount || 0) / (medCount * 30)) * 100), 100);
            } else {
                throw new Error("no medications, use checkin fallback");
            }
        } catch {
            // Fallback: check-in count adherence (also handles missing medications table)
            const { count: adherenceCount } = await supabase
                .from("check_ins")
                .select("*", { count: 'exact', head: true })
                .eq("user_id", userId)
                .gte("created_at", thirtyDaysAgo.toISOString());

            adherence = Math.min(Math.round(((adherenceCount || 0) / 30) * 100), 100);
        }

        // 3. Streak from profile (column may not exist yet)
        let streak = 0;
        try {
            const { data: profileData } = await supabase
                .from("profiles")
                .select("streak")
                .eq("id", userId)
                .single();

            streak = profileData?.streak || 0;
        } catch {
            // streak column may not exist — default to 0
        }

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
    } catch (error: any) {
        console.error("Dashboard error:", error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
