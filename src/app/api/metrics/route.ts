import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db, seedIfEmpty } from "@/lib/db";
import type { Metrics } from "@/lib/types";

export const runtime = "nodejs";

/** Metricas del dashboard. Una sola query con subselects en vez de cinco viajes. */
export async function GET(req: Request): Promise<NextResponse> {
  const session = await requireAuth(req);
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  seedIfEmpty();

  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();

  const metrics = db
    .prepare(
      `SELECT
         COUNT(*)                                              AS totalUsers,
         SUM(CASE WHEN status = 'active'  THEN 1 ELSE 0 END)   AS activeUsers,
         SUM(CASE WHEN role   = 'admin'   THEN 1 ELSE 0 END)   AS adminUsers,
         SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END)   AS pendingUsers,
         SUM(CASE WHEN created_at >= ?    THEN 1 ELSE 0 END)   AS newLast30Days
       FROM users`,
    )
    .get(since) as Metrics;

  return NextResponse.json(metrics);
}
