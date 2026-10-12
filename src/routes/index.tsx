import { ArrowRight } from "lucide-react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Bullets, Button, Logo, StatBlock, StepCards } from "@/design-system/design-system-updated-53e58f";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Packing Video Hub | Order packing videos for e-commerce" },
      { name: "description", content: "Upload, link and share packing videos for every order. Stored in Google Drive, shared on WhatsApp." },
      { property: "og:title", content: "Packing Video Hub" },
      { property: "og:description", content: "Upload, link and share packing videos for every order." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen flex-col">
      <section className="bg-surface-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
          <Logo width={130} />
          <Link to="/auth" className="btn-link">Sign in</Link>
        </div>
      </section>
      <section className="bg-gradient-primary">
        <div className="mx-auto max-w-7xl px-6 py-24">
          <div className="stat-label mb-6">Video management for online stores</div>
          <h1 className="h-hero max-w-5xl">Proof of packing for every order</h1>
          <p className="mt-8 max-w-2xl text-lg">Record the pack, upload it against the order ID, and send the customer a link on WhatsApp in one tap.</p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Button size="lg" onClick={() => navigate({ to: "/app" })}>Open the demo<ArrowRight className="h-4 w-4" aria-hidden /></Button>
          </div>
        </div>
      </section>
      <section className="bg-surface-white">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <StepCards steps={[
            { title: "Upload", body: "Large files go up in chunks with a live progress bar, straight into Google Drive." },
            { title: "Link", body: "Every video is tied to an order ID, SKU and date, and is searchable in seconds." },
            { title: "Share", body: "Open in Drive or send a WhatsApp message with the video link pre-filled." },
          ]} />
        </div>
      </section>
      <section className="bg-surface-light">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-6 py-20 md:grid-cols-2">
          <div className="grid-2">
            <StatBlock value="750GB" label="Daily upload capacity" />
            <StatBlock value="30" label="Day recovery window" />
          </div>
          <Bullets items={[
            "One store, with multiple admins",
            "Scheduled ZIP backups with retention rules",
            "Audit log and CSV export for every action",
            "Email broadcasts to all admins",
          ]} />
        </div>
      </section>
      <footer className="bg-surface-navy px-6 py-6 text-center text-sm">© {new Date().getFullYear()} Packing Video Hub. All rights reserved.</footer>
    </div>
  );
}
