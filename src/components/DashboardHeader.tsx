export function DashboardHeader({
  user,
  onLogout,
}: {
  user: { name: string; email: string; role: string };
  onLogout: () => void;
}) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <div className="flex items-center gap-3">
          <img src="/logo.jpg" alt="Credicorp Bank" className="h-9 w-auto" />
          <div className="hidden border-l border-slate-200 pl-3 sm:block">
            <p className="text-xs text-slate-500">Panel de administración</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium leading-tight">{user.name}</p>
            <p className="text-xs text-slate-500">{user.email}</p>
          </div>
          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
            {user.role}
          </span>
          <button
            type="button"
            onClick={onLogout}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
          >
            Salir
          </button>
        </div>
      </div>
    </header>
  );
}
