import { KeyRound, Save, HardDrive, Check } from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Card, CardTitle } from "@/design-system/design-system-updated-53e58f";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/lib/auth-context";
import { useProfile, useUpdateProfile, useChangePassword, useDriveStatus, useConnectDrive } from "@/lib/hooks";

export const Route = createFileRoute("/app/profile")({
  head: () => ({ meta: [{ title: "Profile | Packing Video Hub" }, { name: "description", content: "Edit your name, photo and password." }] }),
  component: Profile,
});

function Profile() {
  const { user } = useAuth();
  const { data: profileData } = useProfile();
  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [saved, setSaved] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    if (profileData?.user?.fullName) setName(profileData.user.fullName);
  }, [profileData?.user?.fullName]);

  const { data: driveStatus } = useDriveStatus();
  const connectDrive = useConnectDrive();
  const qc = useQueryClient();

  const handleConnectDrive = useCallback(() => {
    connectDrive.mutate(undefined, {
      onSuccess: (url) => {
        const popup = window.open(url, "google-drive-auth", "width=500,height=600");
        const handler = (e: MessageEvent) => {
          if (e.data === "google-drive-connected") {
            qc.invalidateQueries({ queryKey: ["drive-status"] });
            window.removeEventListener("message", handler);
          }
        };
        window.addEventListener("message", handler);
      },
    });
  }, [connectDrive, qc]);

  return (
    <>
      <PageHeader eyebrow={user?.role === "super_admin" ? "Super Admin" : "Admin"} title="Profile" />
      <div className="grid-2">
        <Card>
          <CardTitle>Details</CardTitle>
          <form className="mt-6 flex flex-col gap-4" onSubmit={(e) => {
            e.preventDefault();
            updateProfile.mutate({ fullName: name }, { onSuccess: () => setSaved("Profile saved.") });
          }}>
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-sky">
                {avatar || profileData?.user?.avatarUrl
                  ? <img src={avatar ?? profileData?.user?.avatarUrl ?? ""} alt="Your photo" className="h-16 w-16 object-cover" />
                  : <span className="font-display text-2xl">{name.charAt(0)}</span>}
              </div>
              <label><span className="field-label">Photo</span>
                <input type="file" accept="image/*" className="field" onChange={(e) => { const f = e.target.files?.[0]; if (f) setAvatar(URL.createObjectURL(f)); }} /></label>
            </div>
            <label><span className="field-label">Full name</span><input className="field" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} /></label>
            <label><span className="field-label">Email</span><input className="field" value={user?.email ?? ""} readOnly /></label>
            <div><Button type="submit"><Save className="h-4 w-4" aria-hidden />Save</Button></div>
            {saved && <p role="status">{saved}</p>}
          </form>
        </Card>
        <Card>
          <CardTitle>Change password</CardTitle>
          <form className="mt-6 flex flex-col gap-4" onSubmit={(e) => {
            e.preventDefault();
            changePassword.mutate(
              { currentPassword, newPassword },
              {
                onSuccess: () => { setSaved("Password updated."); setCurrentPassword(""); setNewPassword(""); },
                onError: (err) => setSaved(err instanceof Error ? err.message : "Failed to update password."),
              },
            );
          }}>
            <label><span className="field-label">Current password</span><input type="password" className="field" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} /></label>
            <label><span className="field-label">New password</span><input type="password" className="field" minLength={8} required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /></label>
            <div><Button type="submit"><KeyRound className="h-4 w-4" aria-hidden />Update password</Button></div>
          </form>
        </Card>
      </div>

      {(user?.role === "super_admin" || user?.role === "admin") && (
        <Card className="mt-8">
          <CardTitle>Google Drive</CardTitle>
          <div className="mt-6 flex items-center gap-4">
            {driveStatus?.connected ? (
              <div className="flex items-center gap-2 text-spruce">
                <Check className="h-5 w-5" aria-hidden />
                <span>Google Drive connected. Uploads will be saved to Drive.</span>
              </div>
            ) : (
              <>
                <p className="text-fine">Connect Google Drive to upload packing videos directly to your Drive.</p>
                <Button onClick={handleConnectDrive} disabled={connectDrive.isPending}>
                  <HardDrive className="h-4 w-4" aria-hidden />Connect Google Drive
                </Button>
              </>
            )}
          </div>
        </Card>
      )}
    </>
  );
}
