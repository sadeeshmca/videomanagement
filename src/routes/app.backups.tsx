import { DatabaseBackup, Download, Loader2 } from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";
import { Badge, Button, Card, CardTitle, TBody, THead, Table } from "@/design-system/design-system-updated-53e58f";
import { PageHeader } from "@/components/PageHeader";
import { useBackups, useCreateBackup, useBackupSchedule, useUpdateBackupSchedule, useDownloadBackup } from "@/lib/hooks";
import type { Backup } from "@/lib/types";
import { addMonths, formatBytes } from "@/lib/format";

export const Route = createFileRoute("/app/backups")({
  head: () => ({ meta: [{ title: "Backups | Packing Video Hub" }, { name: "description", content: "Schedule ZIP backups and download past ones." }] }),
  component: Backups,
});

export function statusBadge(b: Backup) {
  const v = b.status === "completed" ? "strong" : b.status === "failed" ? "alert" : b.status === "running" ? "dark" : "default";
  return <Badge variant={v}>{b.status === "running" ? `running ${b.progress}%` : b.status}</Badge>;
}

function formatDate(d: string) {
  return String(d).slice(0, 16).replace("T", " ");
}

function Backups() {
  const { data: backups = [] } = useBackups();
  const createBackup = useCreateBackup();
  const { data: schedule } = useBackupSchedule();
  const updateSchedule = useUpdateBackupSchedule();
  const downloadBackup = useDownloadBackup();

  const next = schedule
    ? addMonths(new Date(schedule.startDate), schedule.intervalMonths).toISOString().slice(0, 10)
    : "-";

  const hasRunning = backups.some((b) => b.status === "running" || b.status === "queued");

  return (
    <>
      <PageHeader eyebrow="ZIP archives in Google Drive" title="Backups">
        <Button onClick={() => createBackup.mutate()} disabled={createBackup.isPending || hasRunning}>
          {createBackup.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <DatabaseBackup className="h-4 w-4" aria-hidden />}
          {hasRunning ? "Backup in progress…" : "Back up now"}
        </Button>
      </PageHeader>

      <div className="grid-2 mb-12">
        <Card>
          <CardTitle>Schedule</CardTitle>
          {schedule ? (
            <div className="mt-6 flex flex-col gap-4">
              <label className="flex items-center gap-3"><input type="checkbox" checked={schedule.enabled} onChange={(e) => updateSchedule.mutate({ enabled: e.target.checked })} /> Automatic backups on</label>
              <label><span className="field-label">Every</span>
                <select className="field" value={schedule.intervalMonths} onChange={(e) => updateSchedule.mutate({ intervalMonths: Number(e.target.value) })}>
                  <option value={1}>1 month</option><option value={3}>3 months</option><option value={6}>6 months</option>
                </select></label>
              <label><span className="field-label">Start date</span>
                <input type="date" className="field" value={schedule.startDate} onChange={(e) => updateSchedule.mutate({ startDate: e.target.value })} /></label>
              <p className="text-fine">Next run: {schedule.enabled ? next : "off"}</p>
            </div>
          ) : (
            <p className="mt-6 text-fine">Loading schedule…</p>
          )}
        </Card>
        <Card>
          <CardTitle>Retention and destination</CardTitle>
          {schedule ? (
            <div className="mt-6 flex flex-col gap-4">
              <label><span className="field-label">Delete backups older than</span>
                <select className="field" value={schedule.retentionDays} onChange={(e) => updateSchedule.mutate({ retentionDays: Number(e.target.value) })}>
                  <option value={90}>90 days</option><option value={180}>180 days</option><option value={365}>1 year</option>
                </select></label>
              <label><span className="field-label">Drive backup folder</span>
                <input className="field" readOnly value="/Backups" /></label>
              <p className="text-fine">Completed backups are stored in the Backup folder on Google Drive.</p>
            </div>
          ) : (
            <p className="mt-6 text-fine">Loading…</p>
          )}
        </Card>
      </div>

      <h2 className="h-dense mb-6">History</h2>
      {backups.length === 0 ? (
        <p className="text-fine">No backups yet. Click "Back up now" to create your first backup.</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <THead><tr><th>Started</th><th>Type</th><th>Status</th><th>Videos</th><th>Size</th><th>Expires</th><th>Download</th></tr></THead>
            <TBody>
              {backups.map((b) => (
                <tr key={b.id}>
                  <td>{formatDate(b.createdAt)}</td>
                  <td>{b.trigger}</td>
                  <td>{statusBadge(b)}</td>
                  <td>{b.videoCount}</td>
                  <td>{b.sizeBytes ? formatBytes(b.sizeBytes) : "-"}</td>
                  <td>{b.expiresAt ? String(b.expiresAt).slice(0, 10) : "-"}</td>
                  <td>
                    {b.status === "completed" ? (
                      <button
                        className="btn-link inline-flex"
                        aria-label="Download ZIP"
                        title="Download ZIP"
                        onClick={() => downloadBackup.mutate(b.id)}
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    ) : b.status === "running" || b.status === "queued" ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : "-"}
                  </td>
                </tr>
              ))}
            </TBody>
          </Table>
        </div>
      )}
    </>
  );
}
