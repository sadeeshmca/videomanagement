import { Download } from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button, TBody, THead, Table } from "@/design-system/design-system-updated-53e58f";
import { PageHeader } from "@/components/PageHeader";
import { useStore } from "@/lib/demo-store";
import { toCsv } from "@/lib/format";

export const Route = createFileRoute("/app/admin/audit")({
  head: () => ({ meta: [{ title: "Audit log | Packing Video Hub" }, { name: "description", content: "Every login, upload and admin change, exportable to CSV." }] }),
  component: AuditLog,
});

function AuditLog() {
  const s = useStore();
  const [q, setQ] = useState("");
  if (s.role !== "super_admin") return <p>Only Super Admins can view the audit log.</p>;
  const rows = s.audit.filter((a) => !q || `${a.actor} ${a.action} ${a.target}`.toLowerCase().includes(q.toLowerCase()));

  function exportCsv() {
    const blob = new Blob([toCsv(rows)], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "audit-log.csv"; a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <>
      <PageHeader eyebrow="Super Admin" title="Audit log"><Button onClick={exportCsv}><Download className="h-4 w-4" aria-hidden />Export CSV</Button></PageHeader>
      <label className="mb-6 block max-w-md"><span className="field-label">Filter</span><input className="field" value={q} onChange={(e) => setQ(e.target.value)} placeholder="login, video.uploaded…" /></label>
      <p className="text-fine mb-4">Entries can't be edited or deleted.</p>
      <div className="overflow-x-auto">
        <Table variant="document">
          <THead><tr><th>When</th><th>Who</th><th>Action</th><th>Target</th></tr></THead>
          <TBody>
            {rows.map((a) => (
              <tr key={a.id}><td>{a.at.slice(0, 16).replace("T", " ")}</td><td>{a.actor}</td><td>{a.action}</td><td>{a.target || "-"}</td></tr>
            ))}
          </TBody>
        </Table>
      </div>
    </>
  );
}
