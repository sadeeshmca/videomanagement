import { Upload } from "lucide-react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button, Card, CardTitle, StatBlock } from "@/design-system/design-system-updated-53e58f";
import { Meter } from "@/components/Meter";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/lib/auth-context";
import { useDashboard } from "@/lib/hooks";

export const Route = createFileRoute("/app/")({
  head: () => ({ meta: [{ title: "Dashboard | Packing Video Hub" }, { name: "description", content: "Storage, uploads and backups at a glance." }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, isLoading } = useDashboard();

  if (isLoading || !data || !user) return <div className="py-12 text-center">Loading…</div>;

  return (
    <>
      <PageHeader eyebrow={data.siteName ?? "Dashboard"} title={`Welcome, ${user.fullName.split(" ")[0]}`}>
        <Button onClick={() => navigate({ to: "/app/upload" })}><Upload className="h-4 w-4" aria-hidden />Upload video</Button>
      </PageHeader>

      <div className="grid-3 mb-12">
        <StatBlock value={data.videoCount} label="Active videos" />
        <StatBlock value={data.userCount} label="Active users" />
        <StatBlock value={data.backupsRunning} label="Backups running" />
      </div>

      <div className="grid-2">
        <Card>
          <CardTitle>Storage</CardTitle>
          <div className="mt-6 flex flex-col gap-6">
            <Meter label="My videos" used={data.myUsedBytes} total={data.myQuotaBytes} />
            {data.siteName && <Meter label={`${data.siteName} quota`} used={data.siteUsedBytes} total={data.siteQuotaBytes} />}
            <Meter label="Today's upload limit (Drive)" used={data.todayUploadBytes} total={data.dailyUploadCap} />
          </div>
        </Card>
        <Card>
            <CardTitle>Recent uploads</CardTitle>
            <ul className="bullets mt-6">
              {data.recentUploads.map((v, i) => <li key={i}>{v.orderId} ({v.sku ?? "-"})</li>)}
            </ul>
          </Card>
      </div>
    </>
  );
}
