import { Request, Response, NextFunction } from "express";
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
 * Auth middleware — extracts user from Supabase JWT.
 * For dev/testing (NODE_ENV !== 'production'), also accepts x-user-id header as fallback.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  // Dev shortcut: x-user-id or uuid header (only in non-production)
  if (process.env.NODE_ENV !== "production") {
    const devUserId = (req.headers["x-user-id"] || req.headers["uuid"]) as string | undefined;
    if (devUserId) {
      req.userId = devUserId;
      return next();
    }
  }

  // Production: Bearer token from Supabase auth
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing authorization header" });
    return;
  }

  const token = authHeader.slice(7);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  // Look up the profile's id using auth_id
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_id", user.id)
    .single();

  req.userId = profile?.id || user.id;
  next();
}
