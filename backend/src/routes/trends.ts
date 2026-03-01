import { Router, Request, Response } from "express";
import { supabase } from "../services/supabase";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get("/", async (req: Request, res: Response) => {
    const userId = req.userId!;
    const rangeParam = req.query.range as string || "week";

    let days = 7;
    if (rangeParam === "2weeks") days = 14;
    if (rangeParam === "month") days = 30;

    try {
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - days + 1);
        pastDate.setHours(0, 0, 0, 0);

        const { data: checkinsData, error } = await supabase
            .from("check_ins")
            .select("created_at, energy, sleep_hours, symptoms(name)")
            .eq("user_id", userId)
            .gte("created_at", pastDate.toISOString())
            .order("created_at", { ascending: true });

        if (error) throw error;

        const checkins = checkinsData || [];

        const grouped: Record<string, any> = {};
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
                sleep: c ? c.sleep_hours : null,
                symptoms: c && c.symptoms ? c.symptoms.map((s: any) => s.name) : []
            });
        }

        res.json(result);
    } catch (error: any) {
        console.error("Trends error:", error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
