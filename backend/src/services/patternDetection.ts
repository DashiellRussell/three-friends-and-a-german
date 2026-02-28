/**
 * Pattern Detection Service — RAG Component
 *
 * Discovers recurring health patterns by clustering check-in embeddings.
 * This is the "intelligence" layer that turns raw vectors into actionable insights.
 *
 * How it works:
 * 1. Fetches all check-ins from the last 30 days that have embeddings
 * 2. For each check-in, finds its nearest neighbors using pgvector cosine similarity
 *    (via the `match_check_ins` Supabase RPC function)
 * 3. Groups check-ins into clusters using a connected-components graph algorithm:
 *    - Two check-ins are connected if their cosine similarity >= 0.82
 *    - A cluster must have 3+ members to be considered a pattern
 * 4. For each cluster, extracts common symptoms and asks Mistral to generate
 *    a human-readable description of the pattern
 *
 * Example output: "Recurring fatigue and headache pattern detected across 5 check-ins
 * over 12 days. Consider consulting a healthcare provider about potential iron deficiency."
 *
 * Used by:
 * - GET /api/patterns — exposes detected patterns to the frontend Trends tab
 * - GET /api/reports/generate — enriches PDF reports with pattern data
 * - POST /api/checkin — fires checkNewCheckinPattern() to detect patterns in real-time
 */

import { supabase } from "./supabase";
import { mistral } from "./mistral";

export interface HealthPattern {
  pattern_type: "recurring_symptom" | "symptom_cluster" | "trend_change";
  description: string;
  confidence: number;      // 0-1 score based on cluster size + symptom overlap
  occurrences: number;     // how many check-ins are in this cluster
  related_checkin_ids: string[];
  first_seen: string;
  last_seen: string;
}

// In-memory cache to avoid re-running expensive embedding lookups on every request.
// TTL is 1 hour — patterns are invalidated early when a new check-in matches a cluster
// (see checkNewCheckinPattern below).
const patternCache = new Map<string, { patterns: HealthPattern[]; expires: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000;

/**
 * Full pattern detection — analyzes all recent check-in embeddings to find clusters.
 *
 * This is computationally expensive (one pgvector RPC per check-in) so results
 * are cached for 1 hour. Called by the /api/patterns endpoint and report generation.
 */
export async function detectPatterns(userId: string): Promise<HealthPattern[]> {
  const cached = patternCache.get(userId);
  if (cached && Date.now() < cached.expires) {
    return cached.patterns;
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Load check-ins that have embeddings (check-ins without embeddings can't participate
  // in similarity search — this is the gap documented in fixes.md for outbound calls)
  const { data: checkIns, error } = await supabase
    .from("check_ins")
    .select("id, summary, mood, energy, sleep_hours, embedding, created_at, flagged, flag_reason, symptoms(name, severity, body_area, is_critical)")
    .eq("user_id", userId)
    .gte("created_at", thirtyDaysAgo.toISOString())
    .not("embedding", "is", null)
    .order("created_at", { ascending: true });

  // Need at least 3 check-ins to form a meaningful cluster
  if (error || !checkIns || checkIns.length < 3) {
    return [];
  }

  // ── Phase 1: Build a neighbor graph ──
  // For each check-in, query pgvector for its k-nearest neighbors.
  // This creates an adjacency list we'll use for clustering.
  const neighborMap = new Map<string, { id: string; similarity: number }[]>();

  for (const ci of checkIns) {
    if (!ci.embedding) continue;

    try {
      // match_check_ins is a Supabase RPC wrapping pgvector's cosine similarity operator.
      // Returns the top N most similar check-ins across all of this user's history.
      const { data: matches } = await supabase.rpc("match_check_ins", {
        query_embedding: ci.embedding,
        match_count: 6, // 5 real neighbors + self (self is always similarity=1.0)
        filter_user_id: userId,
      });

      if (matches) {
        const neighbors = matches
          .filter((m: any) => m.id !== ci.id) // remove self-match
          .map((m: any) => ({ id: m.id, similarity: m.similarity }));
        neighborMap.set(ci.id, neighbors);
      }
    } catch {
      // Non-fatal: skip this check-in if the RPC call fails
    }

    // Rate-limit pgvector queries to avoid overwhelming the database
    await new Promise((r) => setTimeout(r, 100));
  }

  // ── Phase 2: Cluster via connected components ──
  // If check-in A is similar to B (>= 0.82) and B is similar to C (>= 0.82),
  // then A, B, C form a cluster — even if A and C aren't directly similar.
  // This captures "chains" of gradually evolving symptoms.
  const SIMILARITY_THRESHOLD = 0.82;
  const visited = new Set<string>();
  const clusters: string[][] = [];

  for (const ci of checkIns) {
    if (visited.has(ci.id)) continue;

    // BFS to find all check-ins connected to this one
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

    // Only keep clusters with 3+ members — fewer is noise, not a pattern
    if (cluster.length >= 3) {
      clusters.push(cluster);
    }
  }

  // ── Phase 3: Describe each cluster ──
  const patterns: HealthPattern[] = [];
  const checkInMap = new Map(checkIns.map((ci) => [ci.id, ci]));

  for (const cluster of clusters) {
    const clusterCheckIns = cluster
      .map((id) => checkInMap.get(id))
      .filter(Boolean) as typeof checkIns;

    // Count which symptoms appear across the cluster to find commonalities
    const symptomCounts: Record<string, number> = {};
    for (const ci of clusterCheckIns) {
      const symptoms = (ci as any).symptoms || [];
      for (const s of symptoms) {
        symptomCounts[s.name] = (symptomCounts[s.name] || 0) + 1;
      }
    }

    // A symptom is "common" to the cluster if it appears in 2+ check-ins
    const commonSymptoms = Object.entries(symptomCounts)
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name);

    const dates = clusterCheckIns.map((ci) => new Date(ci.created_at));
    const firstSeen = new Date(Math.min(...dates.map((d) => d.getTime())));
    const lastSeen = new Date(Math.max(...dates.map((d) => d.getTime())));
    const daySpan = Math.max(1, Math.ceil((lastSeen.getTime() - firstSeen.getTime()) / (1000 * 60 * 60 * 24)));

    // Feed the cluster data to Mistral to generate a human-readable pattern description
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
      // Fallback to a template description if Mistral is unavailable
      description = commonSymptoms.length > 0
        ? `Recurring pattern of ${commonSymptoms.join(", ")} reported ${cluster.length} times over ${daySpan} days.`
        : `Similar health state reported ${cluster.length} times over ${daySpan} days.`;
    }

    // Classify the pattern type based on what we found:
    // - symptom_cluster: 2+ common symptoms (e.g., headache + dizziness together)
    // - recurring_symptom: 1 common symptom recurring across check-ins
    // - trend_change: similar embeddings but no specific symptom extracted
    const hasCommonSymptoms = commonSymptoms.length > 0;
    patterns.push({
      pattern_type: hasCommonSymptoms
        ? commonSymptoms.length >= 2
          ? "symptom_cluster"
          : "recurring_symptom"
        : "trend_change",
      description,
      // Confidence formula: base 0.5 + 0.08 per cluster member + 0.15 bonus for symptom overlap
      // Capped at 0.95 to never claim certainty
      confidence: Math.min(0.95, 0.5 + cluster.length * 0.08 + (hasCommonSymptoms ? 0.15 : 0)),
      occurrences: cluster.length,
      related_checkin_ids: cluster,
      first_seen: firstSeen.toISOString(),
      last_seen: lastSeen.toISOString(),
    });
  }

  // Surface the most significant patterns first
  patterns.sort((a, b) => b.confidence * b.occurrences - a.confidence * a.occurrences);

  patternCache.set(userId, { patterns, expires: Date.now() + CACHE_TTL_MS });

  return patterns;
}

/**
 * Lightweight real-time pattern check — called immediately after a new check-in is created.
 *
 * Instead of re-clustering everything (expensive), this just asks:
 * "Does the new check-in's embedding have 3+ high-similarity neighbors?"
 * If yes, the user is likely experiencing a recurring pattern.
 *
 * Also invalidates the pattern cache so the next full detectPatterns() call
 * will incorporate the new check-in.
 *
 * Called from POST /api/checkin after embedding the new check-in summary.
 */
export async function checkNewCheckinPattern(
  checkinEmbedding: number[],
  userId: string,
): Promise<HealthPattern | null> {
  try {
    // Single pgvector query — much cheaper than full detectPatterns()
    const { data: matches } = await supabase.rpc("match_check_ins", {
      query_embedding: checkinEmbedding,
      match_count: 5,
      filter_user_id: userId,
    });

    if (!matches) return null;

    // 0.82 threshold matches the full clustering algorithm above
    const highSimilarity = matches.filter((m: any) => m.similarity >= 0.82);
    if (highSimilarity.length < 3) return null;

    const summaries = highSimilarity.map((m: any) => m.summary).filter(Boolean);
    const dates = highSimilarity.map((m: any) => new Date(m.created_at));
    const firstSeen = new Date(Math.min(...dates.map((d: Date) => d.getTime())));
    const lastSeen = new Date(Math.max(...dates.map((d: Date) => d.getTime())));

    // Force a fresh cluster analysis on the next detectPatterns() call
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
