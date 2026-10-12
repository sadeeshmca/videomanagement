import { Globe, Lock, ChevronLeft, ChevronRight, ExternalLink, MessageCircle, RotateCcw, Tag, Trash2 } from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Badge, Button, TBody, THead, Table } from "@/design-system/design-system-updated-53e58f";
import { PageHeader } from "@/components/PageHeader";
import { useStore, useVisibleVideos } from "@/lib/demo-store";
import { daysLeftToRecover, formatBytes, whatsappLink } from "@/lib/format";

export const Route = createFileRoute("/app/videos")({
  head: () => ({ meta: [{ title: "Videos | Packing Video Hub" }, { name: "description", content: "Search, share and manage order packing videos." }] }),
  component: Videos,
});

const PAGE = 10;

function Videos() {
  const s = useStore();
  const all = useVisibleVideos();
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [view, setView] = useState<"active" | "trash">("active");
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [tag, setTag] = useState("");

  const rows = useMemo(() => all
    .filter((v) => (view === "trash" ? v.deletedAt : !v.deletedAt))
    .filter((v) => !q || `${v.orderId} ${v.sku} ${v.title}`.toLowerCase().includes(q.toLowerCase()))
    .filter((v) => (!from || v.orderDate >= from) && (!to || v.orderDate <= to))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [all, q, from, to, view]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const shown = rows.slice(page * PAGE, page * PAGE + PAGE);

  const patch = (ids: string[], fn: (v: (typeof all)[number]) => Partial<(typeof all)[number]>) =>
    s.update((st) => ({ videos: st.videos.map((v) => (ids.includes(v.id) ? { ...v, ...fn(v) } : v)) }));
  const ids = [...sel];
  const toggle = (id: string) => setSel((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const demoLink = (orderId: string) => `https://drive.google.com/file/d/demo-${orderId}/view`;

  return (
    <>
      <PageHeader eyebrow={s.sites[0]?.name} title="Videos" />

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-5">
        <label className="md:col-span-2"><span className="field-label">Search order, SKU or title</span>
          <input className="field" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="ORD-10420" /></label>
        <label><span className="field-label">From</span><input type="date" className="field" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label><span className="field-label">To</span><input type="date" className="field" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        <label><span className="field-label">Show</span>
          <select className="field" value={view} onChange={(e) => { setView(e.target.value as "active" | "trash"); setSel(new Set()); setPage(0); }}>
            <option value="active">Active</option><option value="trash">Recently deleted</option>
          </select></label>
      </div>

      {sel.size > 0 && (
        <div className="bg-surface-sky mb-6 flex flex-wrap items-center gap-4 p-4">
          <span className="stat-label">{sel.size} selected</span>
          {view === "active" ? (
            <>
              <Button size="sm" onClick={() => { patch(ids, () => ({ deletedAt: new Date().toISOString() })); s.log("video.bulk_deleted", `${ids.length} videos`); setSel(new Set()); }}><Trash2 className="h-4 w-4" aria-hidden />Delete</Button>
              <input className="field w-40" placeholder="Tag name" value={tag} onChange={(e) => setTag(e.target.value)} />
              <Button size="sm" variant="link" disabled={!tag.trim()} onClick={() => { patch(ids, (v) => ({ tags: [...new Set([...v.tags, tag.trim()])] })); setTag(""); setSel(new Set()); }}><Tag className="h-4 w-4" aria-hidden />Add tag</Button>
            </>
          ) : (
            <Button size="sm" onClick={() => { patch(ids, () => ({ deletedAt: null })); s.log("video.restored", `${ids.length} videos`); setSel(new Set()); }}><RotateCcw className="h-4 w-4" aria-hidden />Restore</Button>
          )}
        </div>
      )}

      <div className="overflow-x-auto">
        <Table>
          <THead>
            <tr>
              <th><input type="checkbox" aria-label="Select all on page" checked={shown.length > 0 && shown.every((v) => sel.has(v.id))}
                onChange={(e) => setSel(e.target.checked ? new Set(shown.map((v) => v.id)) : new Set())} /></th>
              <th>Order</th><th>SKU</th><th>Date</th><th>Size</th><th>Sharing</th><th>Actions</th>
            </tr>
          </THead>
          <TBody>
            {shown.map((v) => (
              <tr key={v.id}>
                <td><input type="checkbox" aria-label={`Select ${v.orderId}`} checked={sel.has(v.id)} onChange={() => toggle(v.id)} /></td>
                <td>
                  <div className="font-medium">{v.orderId}</div>
                  <div className="mt-1 flex gap-2">{v.tags.map((t) => <Badge key={t}>{t}</Badge>)}</div>
                </td>
                <td>{v.sku}</td>
                <td>{v.orderDate}</td>
                <td>{formatBytes(v.sizeBytes)}</td>
                <td>
                  {view === "trash" ? <Badge variant="alert">{daysLeftToRecover(v.deletedAt!)} days left</Badge> : (
                    <Button variant="link" aria-label={v.isPublic ? "Anyone with link (click to make private)" : "Private (click to make public)"} title={v.isPublic ? "Anyone with link" : "Private"} onClick={() => { patch([v.id], (x) => ({ isPublic: !x.isPublic })); s.log(v.isPublic ? "video.made_private" : "video.made_public", v.orderId); }}>
                      {v.isPublic ? <><Globe className="h-4 w-4" aria-hidden /></> : <><Lock className="h-4 w-4" aria-hidden /></>}
                    </Button>
                  )}
                </td>
                <td>
                  {view === "active" ? (
                    <div className="flex flex-wrap gap-4">
                      <Button variant="link" asChild><a href={demoLink(v.orderId)} target="_blank" rel="noreferrer" aria-label="Open in Drive" title="Open in Drive"><ExternalLink className="h-4 w-4" aria-hidden /></a></Button>
                      {v.isPublic ? (
                        <Button variant="link" asChild><a href={whatsappLink(v.customerPhone, v.orderId, demoLink(v.orderId))} target="_blank" rel="noreferrer" aria-label="Share on WhatsApp" title="Share on WhatsApp"><MessageCircle className="h-4 w-4" aria-hidden /></a></Button>
                      ) : <span className="inline-block h-4 w-4" aria-hidden />}
                      <Button variant="link" aria-label="Delete" title="Delete" onClick={() => { patch([v.id], () => ({ deletedAt: new Date().toISOString() })); s.log("video.deleted", v.orderId); }}><Trash2 className="h-4 w-4" aria-hidden /></Button>
                    </div>
                  ) : (
                    <Button variant="link" aria-label="Restore" title="Restore" onClick={() => patch([v.id], () => ({ deletedAt: null }))}><RotateCcw className="h-4 w-4" aria-hidden /></Button>
                  )}
                </td>
              </tr>
            ))}
            {!shown.length && <tr><td colSpan={7}>No videos match these filters.</td></tr>}
          </TBody>
        </Table>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <span className="text-fine">{rows.length} videos, page {page + 1} of {pages}</span>
        <div className="flex gap-4">
          <Button size="sm" variant="link" disabled={page === 0} onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4" aria-hidden />Previous</Button>
          <Button size="sm" variant="link" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>Next<ChevronRight className="h-4 w-4" aria-hidden /></Button>
        </div>
      </div>
    </>
  );
}
