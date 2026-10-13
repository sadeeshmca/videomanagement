import { UserPlus, UserX, UserCheck, Trash2 } from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Badge, Button, Card, CardTitle, TBody, THead, Table } from "@/design-system/design-system-updated-53e58f";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/lib/auth-context";
import { useUsers, useInviteUser, usePatchUser, useDeleteUser, useSites } from "@/lib/hooks";

export const Route = createFileRoute("/app/admin/users")({
  head: () => ({ meta: [{ title: "Admins | Packing Video Hub" }, { name: "description", content: "Invite, suspend and assign site admins." }] }),
  component: Users,
});

function Users() {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [q, setQ] = useState("");
  const [note, setNote] = useState("");

  const { data: users = [] } = useUsers(q);
  const { data: sites = [] } = useSites();
  const inviteUser = useInviteUser();
  const patchUser = usePatchUser();
  const deleteUser = useDeleteUser();

  const siteId = sites[0]?.id ?? "";

  if (user?.role !== "super_admin") return <p>Only Super Admins can manage admins.</p>;

  return (
    <>
      <PageHeader eyebrow="Super Admin" title="Admins" />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <Card>
          <CardTitle>Invite admin</CardTitle>
          <form className="mt-6 flex flex-col gap-4" onSubmit={(e) => {
            e.preventDefault();
            if (!/^\S+@\S+\.\S+$/.test(email)) return;
            inviteUser.mutate({ email, siteId }, {
              onSuccess: () => { setNote(`Invitation sent to ${email}.`); setEmail(""); },
            });
          }}>
            <label><span className="field-label">Email</span><input type="email" className="field" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
            <div><Button type="submit"><UserPlus className="h-4 w-4" aria-hidden />Send invite</Button></div>
            {note && <p role="status">{note}</p>}
          </form>
        </Card>
        <div className="lg:col-span-2">
          <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-1">
            <label><span className="field-label">Search</span><input className="field" value={q} onChange={(e) => setQ(e.target.value)} /></label>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <THead><tr><th>Name</th><th>Role</th><th>Status</th><th /></tr></THead>
              <TBody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td><div className="font-medium">{u.fullName}</div><div className="text-fine">{u.email}</div></td>
                    <td>{u.role === "super_admin" ? "Super Admin" : "Admin"}</td>
                    <td><Badge variant={u.suspended ? "alert" : "strong"}>{u.suspended ? "suspended" : "active"}</Badge></td>
                    <td className="whitespace-nowrap">
                      {u.id !== user.id && (
                        <>
                          <button className="btn-link mr-4 inline-flex" aria-label={u.suspended ? "Reactivate" : "Suspend"} title={u.suspended ? "Reactivate" : "Suspend"} onClick={() => patchUser.mutate({ id: u.id, suspended: !u.suspended })}>
                            {u.suspended ? <UserCheck className="h-4 w-4" /> : <UserX className="h-4 w-4" />}
                          </button>
                          <button className="btn-link inline-flex" aria-label="Delete" title="Delete" onClick={() => { if (confirm(`Delete ${u.email}?`)) deleteUser.mutate(u.id); }}><Trash2 className="h-4 w-4" /></button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </TBody>
            </Table>
          </div>
        </div>
      </div>
    </>
  );
}
