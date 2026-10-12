import { DatabaseBackup, Download } from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { Badge, Button, Card, CardTitle, TBody, THead, Table } from "@/design-system/design-system-updated-53e58f";
import { PageHeader } from "@/components/PageHeader";
import { useStore, type Backup, type Schedule } from "@/lib/demo-store";
import { addMonths, formatBytes } from "@/lib/format";

export const Route = createFileRoute("/app/backups")({
  head: () => ({ meta: [{ title: "Backups | Packing Video Hub" }, { name: "description", content: "Schedule ZIP backups and download past ones." }] }),
  component: Backups,
});

export function statusBadge(b: Backup) {
  const v = b.status === "completed" ? "strong" : b.status === "failed" ? "alert" : b.status === "running" ? "dark" : "default";
  return <Badge variant={v}>{b.status === "running" ? `running ${b.progress}%` : b.status}</Badge>;
}

function useTickRunningBackups() {
  const s = useStore();
  const running = s.backups.some((b) => b.status === "running");
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => s.update((st) => ({
      backups: st.backups.map((b) => b.status !== "running" ? b : b.progress >= 95
        ? { ...b, status: "completed", progress: 100, sizeBytes: b.videoCount * 120 * 1024 ** 2, expiresAt: new Date(Date.now() + st.schedule.retentionDays * 86400000).toISOString() }
        : { ...b, progress: b.progress + 5 }),
    })), 700);
    return () => clearInterval(t);
  }, [running]); // eslint-disable-line react-hooks/exhaustive-deps
}

function Backups() {
  const s = useStore();
  useTickRunningBackups();
  const mine = s.backups.filter((b) => b.userId === s.me.id || s.role === "super_admin");
  const sch = s.schedule;
  const setSch = (p: Partial<Schedule>) => s.update((st) => ({ schedule: { ...st.schedule, ...p } }));
  const next = addMonths(new Date(sch.startDate), sch.intervalMonths).toISOString().slice(0, 10);

  function runNow() {
    const count = s.videos.filter((v) => v.ownerId === s.me.id && !v.deletedAt).length;
    s.update((st) => ({ backups: [{ id: `b${Date.now()}`, userId: s.me.id, trigger: "manual", status: "running", progress: 0, videoCount: count, sizeBytes: 0, createdAt: new Date().toISOString(), expiresAt: null }, ...st.backups] }));
    s.log("backup.started", "manual");
  }

  return (
    <>
      <PageHeader eyebrow="ZIP archives in Google Drive" title="Backups">
        <Button onClick={runNow}><DatabaseBackup className="h-4 w-4" aria-hidden />Back up now</Button>
      </PageHeader>

      <div className="grid-2 mb-12">
        <Card>
          <CardTitle>Schedule</CardTitle>
          <div className="mt-6 flex flex-col gap-4">
            <label className="flex items-center gap-3"><input type="checkbox" checked={sch.enabled} onChange={(e) => setSch({ enabled: e.target.checked })} /> Automatic backups on</label>
            <label><span className="field-label">Every</span>
              <select className="field" value={sch.intervalMonths} onChange={(e) => setSch({ intervalMonths: Number(e.target.value) as 1 | 3 | 6 })}>
                <option value={1}>1 month</option><option value={3}>3 months</option><option value={6}>6 months</option>
              </select></label>
            <label><span className="field-label">Start date</span>
              <input type="date" className="field" value={sch.startDate} onChange={(e) => setSch({ startDate: e.target.value })} /></label>
            <p className="text-fine">Next run: {sch.enabled ? next : "off"}</p>
          </div>
        </Card>
        <Card>
          <CardTitle>Retention and destination</CardTitle>
          <div className="mt-6 flex flex-col gap-4">
            <label><span className="field-label">Delete backups older than</span>
              <select className="field" value={sch.retentionDays} onChange={(e) => setSch({ retentionDays: Number(e.target.value) })}>
                <option value={90}>90 days</option><option value={180}>180 days</option><option value={365}>1 year</option>
              </select></label>
            <label><span className="field-label">Drive backup folder</span>
              <input className="field" readOnly value="/Backups/Northwind Store" /></label>
            <p className="text-fine">You'll get an email when each backup finishes or fails.</p>
          </div>
        </Card>
      </div>

      <h2 className="h-dense mb-6">History</h2>
      <div className="overflow-x-auto">
        <Table>
          <THead><tr><th>Started</th><th>Type</th><th>Status</th><th>Videos</th><th>Size</th><th>Expires</th><th>Download</th></tr></THead>
          <TBody>
            {mine.map((b) => (
              <tr key={b.id}>
                <td>{b.createdAt.slice(0, 16).replace("T", " ")}</td>
                <td>{b.trigger}</td>
                <td>{statusBadge(b)}</td>
                <td>{b.videoCount}</td>
                <td>{b.sizeBytes ? formatBytes(b.sizeBytes) : "-"}</td>
                <td>{b.expiresAt?.slice(0, 10) ?? "-"}</td>
                <td>{b.status === "completed" ? <a className="btn-link inline-flex" href="#" aria-label="Download ZIP" title="Download ZIP" onClick={(e) => e.preventDefault()}><Download className="h-4 w-4" /></a> : "-"}</td>
              </tr>
            ))}
          </TBody>
        </Table>
      </div>
    </>
  );
}
