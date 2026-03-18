import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

// Usamos una variable de entorno, pero ponemos un 'fallback' para desarrollo local
const SECRET = process.env.JWT_SECRET || "super_secreto_desarrollo_123";

export function signAdminToken(payload: { username: string }) {
  // Aquí le decimos que caduque en 24 horas ('1d' = 1 day)
  return jwt.sign(payload, SECRET, { expiresIn: "1d" });
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "missing_token" });
  }

  const token = authHeader.split(" ")[1];

  try {
    // Si el token es válido y no ha caducado, verify funciona.
    const decoded = jwt.verify(token, SECRET as string);    (req as any).user = decoded;
    next();
  } catch (err: any) {
    // Si falla (está mal firmado, o han pasado más de 24h), da error 401
    console.warn("⚠️ Token rechazado:", err.message);
    return res.status(401).json({ error: "invalid_or_expired_token" });
  }
}