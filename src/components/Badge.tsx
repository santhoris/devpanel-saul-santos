const ROLE_STYLES: Record<string, string> = {
  admin: "bg-indigo-500/15 text-indigo-300",
  editor: "bg-amber-500/15 text-amber-300",
  viewer: "bg-slate-500/20 text-slate-300",
};

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-300",
  inactive: "bg-rose-500/15 text-rose-300",
  pending: "bg-sky-500/15 text-sky-300",
};

export function Badge({
  value,
  kind,
}: {
  value: string;
  kind: "role" | "status";
}) {
  const styles = kind === "role" ? ROLE_STYLES : STATUS_STYLES;
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
        styles[value] ?? "bg-slate-700 text-slate-200"
      }`}
    >
      {value}
    </span>
  );
}
