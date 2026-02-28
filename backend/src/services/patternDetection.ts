import { supabase } from "./supabase";
import { mistral } from "./mistral";

export interface HealthPattern {
  pattern_type: "recurring_symptom" | "symptom_cluster" | "trend_change";
  description: string;
  confidence: number;
  occurrences: number;
  related_checkin_ids: string[];
  first_seen: string;
  last_seen: string;
}

// Simple in-memory cache (1 hour TTL)
const patternCache = new Map<string, { patterns: HealthPattern[]; expires: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Detect recurring symptom patterns by analyzing embedding similarity
 * between recent check-ins via pgvector.
 */
export async function detectPatterns(userId: string): Promise<HealthPattern[]> {
  // Check cache
  const cached = patternCache.get(userId);
  if (cached && Date.now() < cached.expires) {
    return cached.patterns;
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Fetch recent check-ins with embeddings and symptoms
  const { data: checkIns, error } = await supabase
    .from("check_ins")
    .select("id, summary, mood, energy, sleep_hours, embedding, created_at, flagged, flag_reason, symptoms(name, severity, body_area, is_critical)")
    .eq("user_id", userId)
    .gte("created_at", thirtyDaysAgo.toISOString())
    .not("embedding", "is", null)
    .order("created_at", { ascending: true });

  if (error || !checkIns || checkIns.length < 3) {
    return [];
  }

  // For each check-in, find its nearest neighbors via the RPC
  const neighborMap = new Map<string, { id: string; similarity: number }[]>();

  for (const ci of checkIns) {
    if (!ci.embedding) continue;

    try {
      const { data: matches } = await supabase.rpc("match_check_ins", {
        query_embedding: ci.embedding,
        match_count: 6, // 5 neighbors + self
        filter_user_id: userId,
      });

      if (matches) {
        // Exclude self
        const neighbors = matches
          .filter((m: any) => m.id !== ci.id)
          .map((m: any) => ({ id: m.id, similarity: m.similarity }));
        neighborMap.set(ci.id, neighbors);
      }
    } catch {
      // Skip this check-in if RPC fails
    }

    // Rate limit
    await new Promise((r) => setTimeout(r, 100));
  }

  // Group check-ins into clusters using connected components
  // Two check-ins are in the same cluster if similarity >= threshold
  const SIMILARITY_THRESHOLD = 0.82;
  const visited = new Set<string>();
  const clusters: string[][] = [];

  for (const ci of checkIns) {
    if (visited.has(ci.id)) continue;

    const cluster: string[] = [];
    const queue = [ci.id];

    while (queue.length > 0) {
      const current = queue.pop()!;
      if (visited.has(current)) continue;
      visited.add(current);
      cluster.push(current);

      const neighbors = neighborMap.get(current) || [];
      for (const neighbor of neighbors) {
        if (neighbor.similarity >= SIMILARITY_THRESHOLD && !visited.has(neighbor.id)) {
          queue.push(neighbor.id);
        }
      }
    }

    if (cluster.length >= 3) {
      clusters.push(cluster);
    }
  }

  // Build patterns from clusters
  const patterns: HealthPattern[] = [];
  const checkInMap = new Map(checkIns.map((ci) => [ci.id, ci]));

  for (const cluster of clusters) {
    const clusterCheckIns = cluster
      .map((id) => checkInMap.get(id))
      .filter(Boolean) as typeof checkIns;

    // Extract common symptoms
    const symptomCounts: Record<string, number> = {};
    for (const ci of clusterCheckIns) {
      const symptoms = (ci as any).symptoms || [];
      for (const s of symptoms) {
        symptomCounts[s.name] = (symptomCounts[s.name] || 0) + 1;
      }
    }

    const commonSymptoms = Object.entries(symptomCounts)
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name);

    const dates = clusterCheckIns.map((ci) => new Date(ci.created_at));
    const firstSeen = new Date(Math.min(...dates.map((d) => d.getTime())));
    const lastSeen = new Date(Math.max(...dates.map((d) => d.getTime())));
    const daySpan = Math.max(1, Math.ceil((lastSeen.getTime() - firstSeen.getTime()) / (1000 * 60 * 60 * 24)));

    // Collect summaries for Mistral description
    const summaries = clusterCheckIns
      .map((ci) => `- ${new Date(ci.created_at).toLocaleDateString()}: ${ci.summary} (energy: ${ci.energy}, mood: ${ci.mood})`)
      .join("\n");

    let description: string;
    try {
      const response = await mistral.chat.complete({
        model: "mistral-large-latest",
        messages: [
          {
            role: "system",
            content: `You are a health pattern analysis assistant. Given a cluster of similar health check-ins, generate a concise 1-2 sentence pattern description. Focus on recurring symptoms, correlations, and potential explanations. Be specific. Include a medical disclaimer if suggesting a possible cause. Do not use markdown.`,
          },
          {
            role: "user",
            content: `These ${cluster.length} check-ins over ${daySpan} days show a similar pattern:\n\n${summaries}\n\nCommon symptoms: ${commonSymptoms.join(", ") || "none extracted"}\n\nDescribe this health pattern concisely.`,
          },
        ],
      });
      description = String(response.choices?.[0]?.message?.content || "").trim();
    } catch {
      description = commonSymptoms.length > 0
        ? `Recurring pattern of ${commonSymptoms.join(", ")} reported ${cluster.length} times over ${daySpan} days.`
        : `Similar health state reported ${cluster.length} times over ${daySpan} days.`;
    }

    const hasCommonSymptoms = commonSymptoms.length > 0;
    patterns.push({
      pattern_type: hasCommonSymptoms
        ? commonSymptoms.length >= 2
          ? "symptom_cluster"
          : "recurring_symptom"
        : "trend_change",
      description,
      confidence: Math.min(0.95, 0.5 + cluster.length * 0.08 + (hasCommonSymptoms ? 0.15 : 0)),
      occurrences: cluster.length,
      related_checkin_ids: cluster,
      first_seen: firstSeen.toISOString(),
      last_seen: lastSeen.toISOString(),
    });
  }

  // Sort by confidence * occurrences
  patterns.sort((a, b) => b.confidence * b.occurrences - a.confidence * a.occurrences);

  // Cache result
  patternCache.set(userId, { patterns, expires: Date.now() + CACHE_TTL_MS });

  return patterns;
}

/**
 * Lightweight check: does a new check-in fit into an existing cluster?
 * Returns a pattern if the check-in has 3+ high-similarity neighbors.
 */
export async function checkNewCheckinPattern(
  checkinEmbedding: number[],
  userId: string,
): Promise<HealthPattern | null> {
  try {
    const { data: matches } = await supabase.rpc("match_check_ins", {
      query_embedding: checkinEmbedding,
      match_count: 5,
      filter_user_id: userId,
    });

    if (!matches) return null;

    const highSimilarity = matches.filter((m: any) => m.similarity >= 0.82);
    if (highSimilarity.length < 3) return null;

    // Extract common info from the matches
    const summaries = highSimilarity.map((m: any) => m.summary).filter(Boolean);
    const dates = highSimilarity.map((m: any) => new Date(m.created_at));
    const firstSeen = new Date(Math.min(...dates.map((d: Date) => d.getTime())));
    const lastSeen = new Date(Math.max(...dates.map((d: Date) => d.getTime())));

    // Invalidate cache since a new check-in changes patterns
    patternCache.delete(userId);

    return {
      pattern_type: "recurring_symptom",
      description: `This check-in is similar to ${highSimilarity.length} previous entries. You may be experiencing a recurring pattern. Summaries: ${summaries.slice(0, 2).join("; ")}`,
      confidence: 0.7,
      occurrences: highSimilarity.length + 1,
      related_checkin_ids: highSimilarity.map((m: any) => m.id),
      first_seen: firstSeen.toISOString(),
      last_seen: lastSeen.toISOString(),
    };
  } catch {
    return null;
  }
}
