import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function initStreaks() {
    console.log("Fetching all profiles...");
    const { data: profiles, error: profileErr } = await supabase.from("profiles").select("id");
    if (profileErr) {
        console.error("Error fetching profiles:", profileErr);
        process.exit(1);
    }

    for (const profile of profiles || []) {
        const { data: checkins, error: checkinErr } = await supabase
            .from("check_ins")
            .select("created_at")
            .eq("user_id", profile.id)
            .order("created_at", { ascending: false });

        if (checkinErr) {
            console.error(`Error fetching checkins for user ${profile.id}:`, checkinErr);
            continue;
        }

        if (!checkins || checkins.length === 0) {
            await supabase
                .from("profiles")
                .update({ streak: 0, streak_updated_on: null })
                .eq("id", profile.id);
            continue;
        }

        // Get unique YYYY-MM-DD dates string in UTC
        const uniqueDates = Array.from(new Set(checkins.map(c => new Date(c.created_at).toISOString().split('T')[0])));

        let streak = 0;
        let streakUpdatedOn = null;

        const todayStr = new Date().toISOString().split('T')[0];
        const yesterdayDate = new Date();
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);
        const yesterdayStr = yesterdayDate.toISOString().split('T')[0];

        // Determine starting point for streak calculation
        let currentCheckDate = new Date();

        if (uniqueDates.includes(todayStr)) {
            streak = 1;
            streakUpdatedOn = todayStr;
            currentCheckDate = new Date();
            currentCheckDate.setDate(currentCheckDate.getDate() - 1);
        } else if (uniqueDates.includes(yesterdayStr)) {
            streak = 1;
            streakUpdatedOn = yesterdayStr;
            currentCheckDate = new Date();
            currentCheckDate.setDate(currentCheckDate.getDate() - 2);
        } else {
            streak = 0;
            streakUpdatedOn = uniqueDates[0]; // Last checked in date
        }

        // Trace consecutive backwards
        if (streak > 0) {
            while (true) {
                const checkStr = currentCheckDate.toISOString().split('T')[0];
                if (uniqueDates.includes(checkStr)) {
                    streak++;
                    currentCheckDate.setDate(currentCheckDate.getDate() - 1);
                } else {
                    break;
                }
            }
        }

        console.log(`Updating ${profile.id} | Streak: ${streak} | Updated On: ${streakUpdatedOn}`);
        await supabase
            .from("profiles")
            .update({ streak, streak_updated_on: streakUpdatedOn })
            .eq("id", profile.id);
    }

    console.log("Streaks initialized successfully.");
    process.exit(0);
}

initStreaks();
