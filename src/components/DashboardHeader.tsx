export function DashboardHeader({
  user,
  onLogout,
}: {
  user: { name: string; email: string; role: string };
  onLogout: () => void;
}) {
  return (
    <header className="border-b border-slate-800 bg-slate-900/60">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-indigo-500 font-bold">
            D
          </span>
          <div>
            <p className="text-sm font-semibold leading-tight">DevPanel</p>
            <p className="text-xs text-slate-400">Panel de administracion</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium leading-tight">{user.name}</p>
            <p className="text-xs text-slate-400">{user.email}</p>
          </div>
          <span className="rounded-full bg-indigo-500/15 px-2.5 py-1 text-xs font-medium text-indigo-300">
            {user.role}
          </span>
          <button
            type="button"
            onClick={onLogout}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 transition hover:border-slate-500 hover:text-white"
          >
            Salir
          </button>
        </div>
      </div>
    </header>
  );
}
