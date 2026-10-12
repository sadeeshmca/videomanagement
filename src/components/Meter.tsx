import { formatBytes, percentUsed } from "@/lib/format";

export function Meter({ label, used, total }: { label: string; used: number; total: number }) {
  const pct = percentUsed(used, total);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-4">
        <span className="stat-label">{label}</span>
        <span className="text-sm">{formatBytes(used)} of {formatBytes(total)} ({pct}%)</span>
      </div>
      <div className="h-2 w-full bg-light-gray" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className={pct >= 90 ? "h-2 bg-navy" : "h-2 bg-spruce"} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
