import { Upload } from "lucide-react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button, Card, CardTitle, StatBlock } from "@/design-system/design-system-updated-53e58f";
import { Meter } from "@/components/Meter";
import { PageHeader } from "@/components/PageHeader";
import { useStore, useVisibleVideos } from "@/lib/demo-store";
import { DAILY_UPLOAD_CAP } from "@/lib/format";

export const Route = createFileRoute("/app/")({
  head: () => ({ meta: [{ title: "Dashboard | Packing Video Hub" }, { name: "description", content: "Storage, uploads and backups at a glance." }] }),
  component: Dashboard,
});

function Dashboard() {
  const s = useStore();
  const navigate = useNavigate();
  const vids = useVisibleVideos().filter((v) => !v.deletedAt);
  const mine = vids.filter((v) => v.ownerId === s.me.id).reduce((a, v) => a + v.sizeBytes, 0);
  const site = s.sites.find((x) => x.id === s.me.siteId);
  const siteUsed = vids.reduce((a, v) => a + v.sizeBytes, 0);

  return (
    <>
      <PageHeader eyebrow={site?.name ?? "Dashboard"} title={`Welcome, ${s.me.name.split(" ")[0]}`}>
        <Button onClick={() => navigate({ to: "/app/upload" })}><Upload className="h-4 w-4" aria-hidden />Upload video</Button>
      </PageHeader>

      <div className="grid-3 mb-12">
        <StatBlock value={vids.length} label="Active videos" />
        <StatBlock value={s.role === "super_admin" ? s.users.filter((u) => !u.suspended).length : 1} label="Active users" />
        <StatBlock value={s.backups.filter((b) => b.status === "running").length} label="Backups running" />
      </div>

      <div className="grid-2">
        <Card>
          <CardTitle>Storage</CardTitle>
          <div className="mt-6 flex flex-col gap-6">
            <Meter label="My videos" used={mine} total={s.me.quotaBytes} />
            {site && <Meter label={`${site.name} quota`} used={siteUsed} total={site.quotaBytes} />}
            <Meter label="Today's upload limit (Drive)" used={s.todayUploadBytes} total={DAILY_UPLOAD_CAP} />
          </div>
        </Card>
        <Card>
            <CardTitle>Recent uploads</CardTitle>
            <ul className="bullets mt-6">
              {vids.slice(0, 5).map((v) => <li key={v.id}>{v.orderId} ({v.sku})</li>)}
            </ul>
          </Card>
      </div>
    </>
  );
}
