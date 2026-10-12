import { KeyRound, Save } from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button, Card, CardTitle } from "@/design-system/design-system-updated-53e58f";
import { PageHeader } from "@/components/PageHeader";
import { useStore } from "@/lib/demo-store";

export const Route = createFileRoute("/app/profile")({
  head: () => ({ meta: [{ title: "Profile | Packing Video Hub" }, { name: "description", content: "Edit your name, photo and password." }] }),
  component: Profile,
});

function Profile() {
  const s = useStore();
  const [name, setName] = useState(s.me.name);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [saved, setSaved] = useState("");

  return (
    <>
      <PageHeader eyebrow={s.role === "super_admin" ? "Super Admin" : "Admin"} title="Profile" />
      <div className="grid-2">
        <Card>
          <CardTitle>Details</CardTitle>
          <form className="mt-6 flex flex-col gap-4" onSubmit={(e) => {
            e.preventDefault();
            s.update((st) => ({ users: st.users.map((u) => (u.id === s.me.id ? { ...u, name } : u)) }));
            setSaved("Profile saved.");
          }}>
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-sky">
                {avatar ? <img src={avatar} alt="Your photo" className="h-16 w-16 object-cover" /> : <span className="font-display text-2xl">{name.charAt(0)}</span>}
              </div>
              <label><span className="field-label">Photo</span>
                <input type="file" accept="image/*" className="field" onChange={(e) => { const f = e.target.files?.[0]; if (f) setAvatar(URL.createObjectURL(f)); }} /></label>
            </div>
            <label><span className="field-label">Full name</span><input className="field" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} /></label>
            <label><span className="field-label">Email</span><input className="field" value={s.me.email} readOnly /></label>
            <div><Button type="submit"><Save className="h-4 w-4" aria-hidden />Save</Button></div>
            {saved && <p role="status">{saved}</p>}
          </form>
        </Card>
        <Card>
          <CardTitle>Change password</CardTitle>
          <form className="mt-6 flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); setSaved("Password updated."); }}>
            <label><span className="field-label">Current password</span><input type="password" className="field" required /></label>
            <label><span className="field-label">New password</span><input type="password" className="field" minLength={8} required /></label>
            <div><Button type="submit"><KeyRound className="h-4 w-4" aria-hidden />Update password</Button></div>
          </form>
        </Card>
      </div>
    </>
  );
}
