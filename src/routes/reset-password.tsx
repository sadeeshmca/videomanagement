import { KeyRound } from "lucide-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button, Card, CardTitle } from "@/design-system/design-system-updated-53e58f";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a new password | Packing Video Hub" },
      { name: "description", content: "Choose a new password for your account." },
      { property: "og:title", content: "Set a new password | Packing Video Hub" },
      { property: "og:description", content: "Choose a new password for your account." },
    ],
  }),
  component: Reset,
});

function Reset() {
  const [done, setDone] = useState(false);
  return (
    <div className="bg-gradient-primary flex min-h-screen items-center justify-center px-6 py-16">
      <Card className="w-full max-w-md">
        <CardTitle>New password</CardTitle>
        {done ? (
          <p className="mt-6">Password updated. <Link to="/auth">Sign in</Link></p>
        ) : (
          <form className="mt-6 flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); setDone(true); }}>
            <label><span className="field-label">New password</span><input type="password" className="field" required minLength={8} /></label>
            <div><Button type="submit"><KeyRound className="h-4 w-4" aria-hidden />Save password</Button></div>
          </form>
        )}
      </Card>
    </div>
  );
}
