import { Archive, ClipboardList, LayoutDashboard, LogOut, Megaphone, Server, Upload, User, Users, Video } from "lucide-react";
import { Link, Outlet, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button, Logo } from "@/design-system/design-system-updated-53e58f";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/app")({
  component: Shell,
});

const nav = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/app/videos", label: "Videos", icon: Video },
  { to: "/app/upload", label: "Upload", icon: Upload },
  { to: "/app/backups", label: "Backups", icon: Archive },
  { to: "/app/profile", label: "Profile", icon: User },
] as const;
const adminNav = [
  { to: "/app/admin/users", label: "Admins", icon: Users },
  { to: "/app/admin/jobs", label: "Jobs", icon: Server },
  { to: "/app/admin/audit", label: "Audit log", icon: ClipboardList },
  { to: "/app/admin/broadcast", label: "Broadcast", icon: Megaphone },
] as const;

function Shell() {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) return <div className="flex min-h-screen items-center justify-center">Loading…</div>;
  if (!user) { navigate({ to: "/auth" }); return null; }

  const items = user.role === "super_admin" ? [...nav, ...adminNav] : nav;
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="bg-surface-spruce text-white flex flex-col gap-8 px-5 py-6 md:sticky md:top-0 md:h-screen md:w-64 md:shrink-0">
        <Link to="/app" aria-label="Dashboard"><Logo surface="dark" width={120} /></Link>
        <nav className="flex flex-row flex-wrap gap-1 md:flex-col" aria-label="Main">
          {items.map((n) => {
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                activeOptions={{ exact: "exact" in n }}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium no-underline text-white hover:text-white"
                activeProps={{ className: "bg-surface-navy" }}
              >
                <Icon className="h-4 w-4" aria-hidden />{n.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto flex flex-col gap-3">
          <div className="text-sm text-white">
            <span className="stat-label">Signed in as</span>
            <p className="mt-1">{user.fullName}</p>
            <p className="text-fine">{user.role === "super_admin" ? "Super Admin" : "Admin"}</p>
          </div>
          <Button variant="link" onClick={() => { logout(); navigate({ to: "/auth" }); }}>
            <LogOut className="h-4 w-4" aria-hidden />Sign out
          </Button>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="bg-surface-white flex-1">
          <div className="mx-auto max-w-6xl px-6 py-12">
            <Outlet />
          </div>
        </main>
        <footer className="bg-surface-navy px-6 py-6 text-center text-sm">© {new Date().getFullYear()} Packing Video Hub. All rights reserved.</footer>
      </div>
    </div>
  );
}
