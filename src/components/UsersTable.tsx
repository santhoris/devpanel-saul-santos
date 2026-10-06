import { Badge } from "./Badge";
import type { PublicUser } from "@/lib/types";

/** Solo fecha (YYYY-MM-DD) para evitar desajustes de locale entre renders. */
const formatDate = (value: string | null) => (value ? value.slice(0, 10) : "—");

export function UsersTable({
  users,
  loading,
}: {
  users: PublicUser[];
  loading: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3 font-medium">Usuario</th>
            <th className="px-4 py-3 font-medium">Rol</th>
            <th className="px-4 py-3 font-medium">Estado</th>
            <th className="px-4 py-3 font-medium">Creado</th>
            <th className="px-4 py-3 font-medium">Ultimo acceso</th>
          </tr>
        </thead>
        <tbody className={loading ? "opacity-40 transition-opacity" : "transition-opacity"}>
          {users.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                {loading ? "Cargando…" : "Sin resultados"}
              </td>
            </tr>
          ) : (
            users.map((user) => (
              <tr key={user.id} className="border-t border-slate-100 transition-colors hover:bg-slate-50">
                <td className="px-4 py-3">
                  <p className="font-medium">{user.name}</p>
                  <p className="text-xs text-slate-500">{user.email}</p>
                </td>
                <td className="px-4 py-3">
                  <Badge value={user.role} kind="role" />
                </td>
                <td className="px-4 py-3">
                  <Badge value={user.status} kind="status" />
                </td>
                <td className="px-4 py-3 text-slate-500">{formatDate(user.created_at)}</td>
                <td className="px-4 py-3 text-slate-500">{formatDate(user.last_login)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
