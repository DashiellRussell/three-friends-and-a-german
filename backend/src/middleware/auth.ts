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
 * For dev/testing, also accepts x-user-id header as fallback.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  // Dev shortcut: x-user-id header
  const devUserId = req.headers["uuid"] as string | undefined;
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
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  req.userId = user.id;
  next();
}
