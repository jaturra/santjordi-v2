import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

// Forzamos a que el tipo de SECRET sea estrictamente 'string' usando 'as string'
const SECRET = (process.env.JWT_SECRET || "super_secreto_desarrollo_123") as string;

export function signAdminToken(payload: { username: string }) {
  return jwt.sign(payload, SECRET, { expiresIn: "1d" });
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "missing_token" });
  }

  const token = authHeader.split(" ")[1];

  try {
    // Al haber forzado SECRET como string arriba, verify ya no se quejará
    const decoded = jwt.verify(token, SECRET);
    (req as any).user = decoded;
    next();
  } catch (err: any) {
    console.warn("⚠️ Token rechazado:", err.message);
    return res.status(401).json({ error: "invalid_or_expired_token" });
  }
}