import { Request, Response, NextFunction } from "express";

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  console.error(err.stack);
  const message = process.env.NODE_ENV === "production" ? "Internal server error" : err.message || "Internal server error";
  res.status(500).json({ error: message });
}
