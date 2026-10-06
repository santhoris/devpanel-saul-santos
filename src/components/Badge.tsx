const ROLE_STYLES: Record<string, string> = {
  admin: "bg-emerald-100 text-emerald-700",
  editor: "bg-amber-100 text-amber-700",
  viewer: "bg-slate-100 text-slate-600",
};

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  inactive: "bg-rose-100 text-rose-700",
  pending: "bg-sky-100 text-sky-700",
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
        styles[value] ?? "bg-slate-100 text-slate-600"
      }`}
    >
      {value}
    </span>
  );
}
