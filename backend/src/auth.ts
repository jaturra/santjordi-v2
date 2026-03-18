import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

const SECRET = (process.env.JWT_SECRET || "super_secreto_desarrollo_123") as string;

export function signAdminToken(payload: { username: string }) {
  return jwt.sign(payload, SECRET, { expiresIn: "1d" });
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "missing_token" });
  }

  // AQUÍ ESTABA EL PROBLEMA: Le aseguramos a TS que esto es un string
  const token = authHeader.split(" ")[1] as string;

  try {
    const decoded = jwt.verify(token, SECRET);
    (req as any).user = decoded;
    next();
  } catch (err: any) {
    console.warn("⚠️ Token rechazado:", err.message);
    return res.status(401).json({ error: "invalid_or_expired_token" });
  }
}