import { Request, Response, NextFunction } from "express";
import { getAuth, clerkClient } from "@clerk/express";
import { supabase } from "../services/supabase";

// Augment Express Request globally so all route handlers can access userId
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

/**
 * Auth middleware — resolves Clerk session to internal profile UUID.
 * Dev shortcut: accepts x-user-id header when NODE_ENV !== "production".
 * Production: uses Clerk JWT → lookup/lazy-provision profile → set req.userId.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  // Dev shortcut: x-user-id header (for local testing without Clerk)
  if (process.env.NODE_ENV !== "production") {
    const devUserId = (req.headers["x-user-id"] || req.headers["uuid"]) as string | undefined;
    if (devUserId) {
      req.userId = devUserId;
      return next();
    }
  }

  // Production / Clerk auth: extract userId from Bearer token
  const { userId: clerkUserId } = getAuth(req);

  if (!clerkUserId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  // Look up internal profile by clerk_user_id
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("clerk_user_id", clerkUserId)
    .single();

  if (profile) {
    req.userId = profile.id;
    return next();
  }

  // Lazy provision: no profile linked yet — fetch email from Clerk and find/create
  try {
    const clerkUser = await clerkClient.users.getUser(clerkUserId);
    const email = clerkUser.emailAddresses[0]?.emailAddress?.toLowerCase();

    if (!email) {
      res.status(400).json({ error: "Clerk user has no email address" });
      return;
    }

    // Check if a profile with this email already exists (link it)
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .single();

    if (existingProfile) {
      // Link the existing profile to this Clerk user
      await supabase
        .from("profiles")
        .update({ clerk_user_id: clerkUserId })
        .eq("id", existingProfile.id);

      req.userId = existingProfile.id;
      return next();
    }

    // No profile at all — create a new one
    const displayName = clerkUser.firstName
      ? `${clerkUser.firstName}${clerkUser.lastName ? ` ${clerkUser.lastName}` : ""}`
      : email.split("@")[0];

    const { data: newProfile, error: createError } = await supabase
      .from("profiles")
      .insert({
        email,
        display_name: displayName,
        clerk_user_id: clerkUserId,
        onboarding_completed: false,
        onboarding_step: 0,
        timezone: "Australia/Sydney",
        language: "en",
        conditions: [],
        allergies: [],
      })
      .select("id")
      .single();

    if (createError) {
      res.status(500).json({ error: "Failed to create profile" });
      return;
    }

    req.userId = newProfile.id;
    return next();
  } catch (err) {
    console.error("Clerk auth error:", err);
    res.status(500).json({ error: "Authentication error" });
    return;
  }
}
