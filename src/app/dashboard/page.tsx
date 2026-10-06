"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardHeader } from "@/components/DashboardHeader";
import { MetricCard } from "@/components/MetricCard";
import { UsersTable } from "@/components/UsersTable";
import { apiFetch, clearToken, getToken } from "@/lib/api";
import type { Metrics, PublicUser, Role, Status, UsersResponse } from "@/lib/types";

const PAGE_SIZE = 10;
const DEBOUNCE_MS = 300;

type Session = { name: string; email: string; role: string };

export default function DashboardPage() {
  const router = useRouter();

  // --- sesion / guard de ruta protegida ---
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  // --- datos ---
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // --- filtros / paginacion ---
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [role, setRole] = useState<"" | Role>("");
  const [status, setStatus] = useState<"" | Status>("");
  const [page, setPage] = useState(1);

  const [error, setError] = useState<string | null>(null);

  const logout = useCallback(() => {
    clearToken();
    router.replace("/login");
  }, [router]);

  // Guard: sin token -> login. Con token, validamos contra /api/auth/me
  // (si el token vencio, apiFetch limpia y redirige solo).
  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    let active = true;
    apiFetch<{ user: PublicUser }>("/api/auth/me")
      .then(({ user }) => {
        if (active) setSession({ name: user.name, email: user.email, role: user.role });
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, [router]);

  // Metricas (una sola vez, cuando la sesion quedo validada).
  useEffect(() => {
    if (!ready) return;
    apiFetch<Metrics>("/api/metrics")
      .then(setMetrics)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Error al cargar metricas"),
      );
  }, [ready]);

  // Debounce del buscador: 300ms sin teclear antes de consultar.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search.trim()), DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [search]);

  // Cualquier cambio de filtro vuelve a la pagina 1.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, role, status]);

  // Tabla: fetch al backend con search/rol/estado/pagina (nunca recarga la pagina).
  useEffect(() => {
    if (!ready) return;
    let active = true;
    setLoadingUsers(true);
    setError(null);

    const query = new URLSearchParams({
      page: String(page),
      limit: String(PAGE_SIZE),
    });
    if (debouncedSearch) query.set("search", debouncedSearch);
    if (role) query.set("role", role);
    if (status) query.set("status", status);

    apiFetch<UsersResponse>(`/api/users?${query.toString()}`)
      .then((res) => {
        if (!active) return;
        setUsers(res.data);
        setTotal(res.total);
        setPages(res.pages);
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : "Error al cargar usuarios");
      })
      .finally(() => {
        if (active) setLoadingUsers(false);
      });

    return () => {
      active = false;
    };
  }, [ready, page, debouncedSearch, role, status]);

  if (!ready || !session) {
    return (
      <main className="grid min-h-screen place-items-center text-slate-500">
        Cargando panel…
      </main>
    );
  }

  return (
    <div className="min-h-screen">
      <DashboardHeader user={session} onLogout={logout} />

      <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        <section>
          <h1 className="text-xl font-semibold">Resumen</h1>
          <p className="text-sm text-slate-500">Estado general de la plataforma</p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Usuarios totales"
            value={metrics?.totalUsers ?? "—"}
            hint={`${metrics?.newLast30Days ?? 0} nuevos en 30 dias`}
          />
          <MetricCard
            label="Activos"
            value={metrics?.activeUsers ?? "—"}
            hint="Estado active"
          />
          <MetricCard
            label="Administradores"
            value={metrics?.adminUsers ?? "—"}
            hint="Rol admin"
          />
          <MetricCard
            label="Pendientes"
            value={metrics?.pendingUsers ?? "—"}
            hint="Sin confirmar"
          />
        </section>

        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Usuarios</h2>
              <p className="text-sm text-slate-500">{total} registros</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre o email…"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 sm:w-64"
              />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as "" | Role)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
              >
                <option value="">Todos los roles</option>
                <option value="admin">admin</option>
                <option value="editor">editor</option>
                <option value="viewer">viewer</option>
              </select>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as "" | Status)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
              >
                <option value="">Todos los estados</option>
                <option value="active">active</option>
                <option value="inactive">inactive</option>
                <option value="pending">pending</option>
              </select>
            </div>
          </div>

          {error ? (
            <p
              role="alert"
              className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
            >
              {error}
            </p>
          ) : null}

          <UsersTable users={users} loading={loadingUsers} />

          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>
              Pagina {page} de {pages}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loadingUsers}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-slate-600 transition hover:border-slate-400 hover:text-slate-900 disabled:opacity-40"
              >
                Anterior
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page >= pages || loadingUsers}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-slate-600 transition hover:border-slate-400 hover:text-slate-900 disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
