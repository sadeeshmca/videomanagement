export const DAILY_UPLOAD_CAP = 750 * 1024 ** 3;
export const SOFT_DELETE_DAYS = 30;

export function formatBytes(n: number): string {
  if (!n || n < 0) return "0 B";
  const u = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(u.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  return `${(n / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${u[i]}`;
}

export function percentUsed(used: number, quota: number): number {
  if (!quota || quota <= 0) return 0;
  return Math.min(100, Math.round((used / quota) * 100));
}

/** Digits only, keeps country code. Returns null when too short to be a phone number. */
export function normalizePhone(phone: string | null | undefined): string | null {
  const d = (phone ?? "").replace(/\D/g, "");
  return d.length >= 8 ? d : null;
}

export function whatsappLink(phone: string | null | undefined, orderId: string, url: string): string {
  const text = encodeURIComponent(`Hello! Here is the packing video for your order ${orderId}: ${url}`);
  const p = normalizePhone(phone);
  return p ? `https://wa.me/${p}?text=${text}` : `https://wa.me/?text=${text}`;
}

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

export function isPastRetention(createdAt: string | Date, days: number, now = new Date()): boolean {
  return now.getTime() - new Date(createdAt).getTime() > days * 86400000;
}

export function daysLeftToRecover(deletedAt: string, now = new Date()): number {
  const left = SOFT_DELETE_DAYS - Math.floor((now.getTime() - new Date(deletedAt).getTime()) / 86400000);
  return Math.max(0, left);
}

export function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
}
