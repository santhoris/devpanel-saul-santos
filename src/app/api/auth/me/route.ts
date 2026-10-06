import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db, toPublicUser, type UserRow } from "@/lib/db";
import type { MeResponse } from "@/lib/types";

export const runtime = "nodejs";

/** Endpoint de validacion de sesion: 401 si el token no sirve. */
export async function GET(req: Request): Promise<NextResponse> {
  const session = await requireAuth(req);
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const row = db
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(session.id) as UserRow | undefined;

  if (!row) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 401 });
  }

  const payload: MeResponse = { user: toPublicUser(row) };
  return NextResponse.json(payload);
}
