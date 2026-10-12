import { createContext, useContext, useState, type ReactNode } from "react";

export type Role = "super_admin" | "admin";
export type Site = { id: string; name: string; slug: string; quotaBytes: number; status: "active" | "paused" };
export type AdminUser = { id: string; name: string; email: string; siteId: string | null; role: Role; suspended: boolean; quotaBytes: number };
export type Video = {
  id: string; siteId: string; ownerId: string; orderId: string; sku: string; customerPhone: string;
  title: string; tags: string[]; sizeBytes: number; isPublic: boolean; orderDate: string;
  createdAt: string; deletedAt: string | null; thumb: string | null;
};
export type Backup = {
  id: string; userId: string; trigger: "manual" | "scheduled"; status: "queued" | "running" | "completed" | "failed" | "expired";
  progress: number; videoCount: number; sizeBytes: number; createdAt: string; expiresAt: string | null;
};
export type Schedule = { intervalMonths: 1 | 3 | 6; startDate: string; retentionDays: number; enabled: boolean };
export type Audit = { id: number; actor: string; action: string; target: string; at: string };
export type Broadcast = { id: string; subject: string; siteId: string | null; recipients: number; at: string };

const GB = 1024 ** 3;
const MB = 1024 ** 2;

function seed() {
  const sites: Site[] = [
    { id: "s1", name: "Northwind Store", slug: "northwind", quotaBytes: 200 * GB, status: "active" },
  ];
  const users: AdminUser[] = [
    { id: "u0", name: "Priya Raman", email: "priya@platform.example", siteId: "s1", role: "super_admin", suspended: false, quotaBytes: 50 * GB },
    { id: "u1", name: "Arjun Mehta", email: "arjun@northwind.example", siteId: "s1", role: "admin", suspended: false, quotaBytes: 20 * GB },
    { id: "u2", name: "Lena Ortiz", email: "lena@northwind.example", siteId: "s1", role: "admin", suspended: false, quotaBytes: 20 * GB },
    { id: "u3", name: "Sam Okafor", email: "sam@northwind.example", siteId: "s1", role: "admin", suspended: true, quotaBytes: 10 * GB },
  ];
  const skus = ["TSHIRT-M", "MUG-01", "SHOE-42", "BAG-XL", "LAMP-02"];
  const videos: Video[] = Array.from({ length: 36 }, (_, i) => {
    const site = sites[0];
    const owner = users[(i % 3) + 1];
    const day = String(28 - (i % 27)).padStart(2, "0");
    return {
      id: `v${i + 1}`, siteId: site.id, ownerId: owner.id,
      orderId: `ORD-${10420 + i}`, sku: skus[i % skus.length],
      customerPhone: `+9198765${String(43000 + i * 7).padStart(5, "0")}`,
      title: `Packing video ${10420 + i}`, tags: i % 4 === 0 ? ["fragile"] : [],
      sizeBytes: (40 + ((i * 37) % 260)) * MB, isPublic: i % 3 === 0,
      orderDate: `2026-09-${day}`, createdAt: `2026-09-${day}T10:${String(i % 60).padStart(2, "0")}:00Z`,
      deletedAt: i % 11 === 5 ? "2026-09-20T09:00:00Z" : null, thumb: null,
    };
  });
  const backups: Backup[] = [
    { id: "b3", userId: "u1", trigger: "manual", status: "running", progress: 45, videoCount: 12, sizeBytes: 0, createdAt: "2026-09-27T09:00:00Z", expiresAt: null },
    { id: "b2", userId: "u1", trigger: "scheduled", status: "completed", progress: 100, videoCount: 118, sizeBytes: 14.2 * GB, createdAt: "2026-06-27T02:00:00Z", expiresAt: "2026-12-24T02:00:00Z" },
    { id: "b1", userId: "u2", trigger: "scheduled", status: "failed", progress: 30, videoCount: 0, sizeBytes: 0, createdAt: "2026-06-01T02:00:00Z", expiresAt: null },
    { id: "b0", userId: "u1", trigger: "scheduled", status: "expired", progress: 100, videoCount: 90, sizeBytes: 9.8 * GB, createdAt: "2026-03-27T02:00:00Z", expiresAt: "2026-09-23T02:00:00Z" },
  ];
  const audit: Audit[] = [
    { id: 6, actor: "Arjun Mehta", action: "video.uploaded", target: "ORD-10420", at: "2026-09-27T10:00:00Z" },
    { id: 5, actor: "Priya Raman", action: "admin.suspended", target: "sam@cedar.example", at: "2026-09-26T15:12:00Z" },
    { id: 4, actor: "Lena Ortiz", action: "login", target: "", at: "2026-09-26T08:40:00Z" },
    { id: 3, actor: "Arjun Mehta", action: "video.deleted", target: "ORD-10425", at: "2026-09-20T09:00:00Z" },
    { id: 2, actor: "Priya Raman", action: "site.created", target: "Northwind Store", at: "2026-09-02T11:00:00Z" },
    { id: 1, actor: "Priya Raman", action: "login", target: "", at: "2026-09-02T10:58:00Z" },
  ];
  return { sites, users, videos, backups, audit, broadcasts: [] as Broadcast[], todayUploadBytes: 182 * GB,
    schedule: { intervalMonths: 3, startDate: "2026-06-27", retentionDays: 180, enabled: true } as Schedule };
}

type State = ReturnType<typeof seed> & { role: Role };
type Ctx = State & {
  me: AdminUser;
  setRole: (r: Role) => void;
  update: (fn: (s: State) => Partial<State>) => void;
  log: (action: string, target?: string) => void;
};

const StoreCtx = createContext<Ctx | null>(null);

export function DemoStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(() => ({ ...seed(), role: "super_admin" }));
  const me = state.users.find((u) => (state.role === "super_admin" ? u.id === "u0" : u.id === "u1"))!;
  const update: Ctx["update"] = (fn) => setState((s) => ({ ...s, ...fn(s) }));
  const log: Ctx["log"] = (action, target = "") =>
    setState((s) => ({ ...s, audit: [{ id: (s.audit[0]?.id ?? 0) + 1, actor: me.name, action, target, at: new Date().toISOString() }, ...s.audit] }));
  return (
    <StoreCtx.Provider value={{ ...state, me, setRole: (role) => setState((s) => ({ ...s, role })), update, log }}>
      {children}
    </StoreCtx.Provider>
  );
}

export function useStore() {
  const c = useContext(StoreCtx);
  if (!c) throw new Error("useStore outside provider");
  return c;
}

/** Videos the current role may see: Super Admin sees all, Admin sees own site only. */
export function useVisibleVideos() {
  const s = useStore();
  return s.role === "super_admin" ? s.videos : s.videos.filter((v) => v.siteId === s.me.siteId);
}
