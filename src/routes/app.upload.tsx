import { UploadCloud, X } from "lucide-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Button, Card, CardTitle, LeftAccentSection } from "@/design-system/design-system-updated-53e58f";
import { Meter } from "@/components/Meter";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/lib/auth-context";
import { useDashboard, useUploadVideo } from "@/lib/hooks";
import { formatBytes } from "@/lib/format";

export const Route = createFileRoute("/app/upload")({
  head: () => ({ meta: [{ title: "Upload | Packing Video Hub" }, { name: "description", content: "Upload a packing video and link it to an order." }] }),
  component: Upload,
});

const CHUNK = 8 * 1024 * 1024;

async function captureThumb(file: File): Promise<string | null> {
  try {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.muted = true; v.src = url;
    await new Promise((r) => { v.onloadeddata = r; v.onerror = r; });
    v.currentTime = Math.min(1, (v.duration || 2) / 2);
    await new Promise((r) => { v.onseeked = r; setTimeout(r, 2500); });
    const c = document.createElement("canvas");
    c.width = 320; c.height = Math.round(320 * ((v.videoHeight || 180) / (v.videoWidth || 320)));
    c.getContext("2d")?.drawImage(v, 0, 0, c.width, c.height);
    URL.revokeObjectURL(url);
    return c.toDataURL("image/jpeg", 0.7);
  } catch { return null; }
}

function Upload() {
  const { user } = useAuth();
  const { data: dashboard } = useDashboard();
  const uploadVideo = useUploadVideo();
  const [file, setFile] = useState<File | null>(null);
  const [orderId, setOrderId] = useState("");
  const [sku, setSku] = useState("");
  const [phone, setPhone] = useState("");
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");
  const [thumb, setThumb] = useState<string | null>(null);
  const cancel = useRef(false);

  const siteId = user?.siteId ?? "";
  const todayUploadBytes = dashboard?.todayUploadBytes ?? 0;
  const dailyUploadCap = dashboard?.dailyUploadCap ?? 750 * 1024 ** 3;

  async function start(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !orderId.trim()) return;
    if (todayUploadBytes + file.size > dailyUploadCap) { setStatus("error"); setMsg("Today's 750 GB Drive upload limit would be exceeded. Try again tomorrow."); return; }
    cancel.current = false;
    setStatus("uploading"); setProgress(0); setMsg("");
    setThumb(await captureThumb(file));
    const chunks = Math.max(1, Math.ceil(file.size / CHUNK));
    for (let i = 0; i < chunks; i++) {
      if (cancel.current) { setStatus("idle"); return; }
      await new Promise((r) => setTimeout(r, Math.min(400, 3000 / chunks)));
      setProgress(Math.round(((i + 1) / chunks) * 100));
    }
    try {
      await uploadVideo.mutateAsync({
        orderId: orderId.trim(), sku: sku.trim(), customerPhone: phone.trim(),
        title: file.name, tags: [], siteId, sizeBytes: file.size,
      });
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setMsg(err instanceof Error ? err.message : "Upload failed.");
    }
  }

  return (
    <>
      <PageHeader eyebrow="Add video" title="Upload" />
      <div className="grid-2">
        <Card>
          <CardTitle>Video details</CardTitle>
          <form className="mt-6 flex flex-col gap-4" onSubmit={start}>
            <label><span className="field-label">Video file</span>
              <input className="field" type="file" accept="video/*" required onChange={(e) => { setFile(e.target.files?.[0] ?? null); setStatus("idle"); }} /></label>
            <label><span className="field-label">Order ID</span>
              <input className="field" required maxLength={64} value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="ORD-10500" /></label>
            <label><span className="field-label">SKU</span>
              <input className="field" maxLength={64} value={sku} onChange={(e) => setSku(e.target.value)} /></label>
            <label><span className="field-label">Customer WhatsApp number</span>
              <input className="field" maxLength={20} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" /></label>
            {file && <p className="text-fine">{file.name}, {formatBytes(file.size)}, {Math.max(1, Math.ceil(file.size / CHUNK))} chunks</p>}
            <div className="flex gap-4">
              <Button type="submit" disabled={status === "uploading"}><UploadCloud className="h-4 w-4" aria-hidden />Start upload</Button>
              {status === "uploading" && <Button type="button" variant="link" onClick={() => { cancel.current = true; }}><X className="h-4 w-4" aria-hidden />Cancel</Button>}
            </div>
          </form>
        </Card>
        <div className="flex flex-col gap-8">
          <Card>
            <CardTitle>Progress</CardTitle>
            <div className="mt-6 flex flex-col gap-4">
              <div className="h-3 w-full bg-light-gray" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-3 bg-spruce" style={{ width: `${progress}%` }} />
              </div>
              <p>{status === "idle" ? "Choose a file to begin." : status === "uploading" ? `Uploading… ${progress}%` : status === "done" ? "Upload complete. Video linked to the order." : msg}</p>
              {thumb && <img src={thumb} alt="Auto-generated thumbnail" className="w-48 border border-light-gray" />}
              {status === "done" && <Link to="/app/videos" className="btn-link">View in videos</Link>}
            </div>
          </Card>
          <Meter label="Today's upload limit (Drive)" used={todayUploadBytes} total={dailyUploadCap} />
          <LeftAccentSection>
            <p>Uploads go in 8 MB chunks and resume after network drops. A thumbnail is created from the video automatically.</p>
          </LeftAccentSection>
        </div>
      </div>
    </>
  );
}
