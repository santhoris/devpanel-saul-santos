import { NextResponse } from "next/server";
import { signToken } from "@/lib/auth";
import { db, seedIfEmpty, toPublicUser, verifyPassword, type UserRow } from "@/lib/db";
import {
  isLimited,
  loginKey,
  registerFailure,
  resetFailures,
} from "@/lib/rate-limit";
import type { LoginResponse } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request): Promise<NextResponse> {
  seedIfEmpty();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  const { email, password } = (body ?? {}) as {
    email?: unknown;
    password?: unknown;
  };

  if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
    return NextResponse.json(
      { error: "Email y contrasena son obligatorios" },
      { status: 400 },
    );
  }

  const normalizedEmail = email.trim().toLowerCase();
  const key = loginKey(req, normalizedEmail);

  // Anti fuerza bruta: solo cuentan los intentos fallidos.
  const limit = isLimited(key);
  if (limit.limited) {
    return NextResponse.json(
      { error: "Demasiados intentos fallidos. Intenta de nuevo mas tarde." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  const row = db
    .prepare("SELECT * FROM users WHERE email = ?")
    .get(normalizedEmail) as UserRow | undefined;

  // Mismo mensaje para usuario inexistente y password incorrecta: no filtramos
  // que cuentas existen.
  if (!row || !verifyPassword(password, row.password_salt, row.password_hash)) {
    registerFailure(key);
    return NextResponse.json({ error: "Credenciales invalidas" }, { status: 401 });
  }

  resetFailures(key);

  const now = new Date().toISOString();
  db.prepare("UPDATE users SET last_login = ? WHERE id = ?").run(now, row.id);

  const user = toPublicUser({ ...row, last_login: now });
  const token = await signToken({
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  });

  const payload: LoginResponse = { token, user };
  return NextResponse.json(payload);
}
