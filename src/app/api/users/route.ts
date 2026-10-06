import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db, seedIfEmpty } from "@/lib/db";
import type { PublicUser, UsersResponse } from "@/lib/types";

export const runtime = "nodejs";

const ALLOWED_LIMITS = [5, 10, 20, 50];
const ROLES = new Set(["admin", "editor", "viewer"]);
const STATUSES = new Set(["active", "inactive", "pending"]);

/**
 * GET /api/users?search=&role=&status=&page=&limit=
 * Busqueda y paginacion resueltas en SQL (no se trae todo al cliente).
 */
export async function GET(req: Request): Promise<NextResponse> {
  const session = await requireAuth(req);
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  seedIfEmpty();

  const { searchParams } = new URL(req.url);
  const search = (searchParams.get("search") ?? "").trim();
  const role = searchParams.get("role") ?? "";
  const status = searchParams.get("status") ?? "";
  const pageRaw = Number(searchParams.get("page") ?? "1");
  const limitRaw = Number(searchParams.get("limit") ?? "10");

  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
  const limit = ALLOWED_LIMITS.includes(limitRaw) ? limitRaw : 10;
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (search) {
    conditions.push("(name LIKE ? OR email LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }
  if (ROLES.has(role)) {
    conditions.push("role = ?");
    params.push(role);
  }
  if (STATUSES.has(status)) {
    conditions.push("status = ?");
    params.push(status);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const { c: total } = db
    .prepare(`SELECT COUNT(*) AS c FROM users ${where}`)
    .get(...params) as { c: number };

  const data = db
    .prepare(
      `SELECT id, name, email, role, status, created_at, last_login
         FROM users ${where}
        ORDER BY created_at DESC, id DESC
        LIMIT ? OFFSET ?`,
    )
    .all(...params, limit, offset) as PublicUser[];

  const payload: UsersResponse = {
    data,
    total,
    page,
    limit,
    pages: Math.max(1, Math.ceil(total / limit)),
  };
  return NextResponse.json(payload);
}
