import { Send } from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button, Card, CardTitle, TBody, THead, Table } from "@/design-system/design-system-updated-53e58f";
import { PageHeader } from "@/components/PageHeader";
import { useStore } from "@/lib/demo-store";

export const Route = createFileRoute("/app/admin/broadcast")({
  head: () => ({ meta: [{ title: "Broadcast | Packing Video Hub" }, { name: "description", content: "Email announcements to all admins." }] }),
  component: BroadcastPage,
});

function BroadcastPage() {
  const s = useStore();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const siteId = "";
  if (s.role !== "super_admin") return <p>Only Super Admins can send broadcasts.</p>;
  const recipients = s.users.filter((u) => !u.suspended && (!siteId || u.siteId === siteId)).length;

  return (
    <>
      <PageHeader eyebrow="Super Admin" title="Email broadcast" />
      <div className="grid-2">
        <Card>
          <CardTitle>New message</CardTitle>
          <form className="mt-6 flex flex-col gap-4" onSubmit={(e) => {
            e.preventDefault();
            if (!subject.trim() || !body.trim()) return;
            s.update((st) => ({ broadcasts: [{ id: `m${Date.now()}`, subject: subject.trim(), siteId: siteId || null, recipients, at: new Date().toISOString() }, ...st.broadcasts] }));
            s.log("broadcast.sent", subject.trim()); setSubject(""); setBody("");
          }}>
            <label><span className="field-label">Subject</span><input className="field" maxLength={200} value={subject} onChange={(e) => setSubject(e.target.value)} /></label>
            <label><span className="field-label">Message</span><textarea className="field" rows={8} maxLength={10000} value={body} onChange={(e) => setBody(e.target.value)} /></label>
            <div className="flex items-center gap-4"><Button type="submit"><Send className="h-4 w-4" aria-hidden />Send to {recipients}</Button></div>
          </form>
        </Card>
        <div>
          <h2 className="h-dense mb-6">Sent</h2>
          <Table>
            <THead><tr><th>When</th><th>Subject</th><th>Audience</th><th>Recipients</th></tr></THead>
            <TBody>
              {s.broadcasts.map((b) => (
                <tr key={b.id}><td>{b.at.slice(0, 10)}</td><td>{b.subject}</td><td>Everyone</td><td>{b.recipients}</td></tr>
              ))}
              {!s.broadcasts.length && <tr><td colSpan={4}>Nothing sent yet.</td></tr>}
            </TBody>
          </Table>
        </div>
      </div>
    </>
  );
}
