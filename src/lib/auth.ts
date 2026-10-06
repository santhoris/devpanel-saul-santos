import { SignJWT, jwtVerify } from "jose";

const SECRET_BYTES = 32;
const rawSecret = process.env.JWT_SECRET ?? "";

// En produccion un secreto por defecto firmaria tokens que cualquiera puede
// falsificar: mejor romper el arranque que servir sesiones inseguras.
if (rawSecret.length < SECRET_BYTES) {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      `JWT_SECRET debe tener al menos ${SECRET_BYTES} caracteres (revisa tu .env)`,
    );
  }
  console.warn(
    "[devpanel] JWT_SECRET ausente o muy corto: usando secreto de desarrollo.",
  );
}

const SECRET = new TextEncoder().encode(
  rawSecret.length >= SECRET_BYTES
    ? rawSecret
    : "devpanel-dev-only-secret-change-me-0123456789abcdef",
);

export const TOKEN_TTL = "2h";

export interface SessionUser {
  id: number;
  email: string;
  role: string;
  name: string;
}

/** Firma un JWT HS256 con el payload minimo necesario para el header. */
export async function signToken(user: SessionUser): Promise<string> {
  return new SignJWT({ email: user.email, role: user.role, name: user.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(user.id))
    .setIssuedAt()
    .setExpirationTime(TOKEN_TTL)
    .sign(SECRET);
}

/** Devuelve la sesion o null si el token falta, esta vencido o fue alterado. */
export async function verifyToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return {
      id: Number(payload.sub),
      email: String(payload.email ?? ""),
      role: String(payload.role ?? "viewer"),
      name: String(payload.name ?? ""),
    };
  } catch {
    return null;
  }
}

export function getBearerToken(req: Request): string | null {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  return token.length > 0 ? token : null;
}

/** Guard para route handlers: devuelve la sesion o null (el caller responde 401). */
export async function requireAuth(req: Request): Promise<SessionUser | null> {
  const token = getBearerToken(req);
  return token ? verifyToken(token) : null;
}
