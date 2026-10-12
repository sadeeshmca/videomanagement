import { createFileRoute } from "@tanstack/react-router";
import { StatBlock, TBody, THead, Table } from "@/design-system/design-system-updated-53e58f";
import { PageHeader } from "@/components/PageHeader";
import { useStore } from "@/lib/demo-store";
import { formatBytes } from "@/lib/format";
import { statusBadge } from "./app.backups";

export const Route = createFileRoute("/app/admin/jobs")({
  head: () => ({ meta: [{ title: "Backup jobs | Packing Video Hub" }, { name: "description", content: "Monitor every backup job." }] }),
  component: Jobs,
});

function Jobs() {
  const s = useStore();
  if (s.role !== "super_admin") return <p>Only Super Admins can view this page.</p>;
  const count = (st: string) => s.backups.filter((b) => b.status === st).length;
  return (
    <>
      <PageHeader eyebrow="Super Admin" title="Backup jobs" />
      <div className="grid-4 mb-12">
        <StatBlock value={count("running")} label="Running" />
        <StatBlock value={count("completed")} label="Completed" />
        <StatBlock value={count("failed")} label="Failed" />
        <StatBlock value={count("expired")} label="Expired" />
      </div>
      <div className="overflow-x-auto">
        <Table>
          <THead><tr><th>Started</th><th>User</th><th>Type</th><th>Status</th><th>Videos</th><th>Size</th></tr></THead>
          <TBody>
            {s.backups.map((b) => (
              <tr key={b.id}>
                <td>{b.createdAt.slice(0, 16).replace("T", " ")}</td>
                <td>{s.users.find((u) => u.id === b.userId)?.name ?? "-"}</td>
                <td>{b.trigger}</td>
                <td>{statusBadge(b)}</td>
                <td>{b.videoCount}</td>
                <td>{b.sizeBytes ? formatBytes(b.sizeBytes) : "-"}</td>
              </tr>
            ))}
          </TBody>
        </Table>
      </div>
    </>
  );
}
