import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

// Definimos explícitamente que esto es un string y NUNCA undefined
const SECRET: string = process.env.JWT_SECRET || "super_secreto_desarrollo_123";

export function signAdminToken(payload: { username: string }) {
  // Aseguramos a TS que SECRET es un string
  return jwt.sign(payload, SECRET, { expiresIn: "1d" });
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "missing_token" });
  }

  const token = authHeader.split(" ")[1];

  try {
    // Usamos el operador "!" para decirle a TS: "Confía en mí, no es undefined"
    const decoded = jwt.verify(token, SECRET!);
    (req as any).user = decoded;
    next();
  } catch (err: any) {
    console.warn("⚠️ Token rechazado:", err.message);
    return res.status(401).json({ error: "invalid_or_expired_token" });
  }
}