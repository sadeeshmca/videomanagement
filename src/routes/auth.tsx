import { LogIn } from "lucide-react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button, Card, CardTitle, Logo } from "@/design-system/design-system-updated-53e58f";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in | Packing Video Hub" },
      { name: "description", content: "Sign in to manage your store's packing videos." },
      { property: "og:title", content: "Sign in | Packing Video Hub" },
      { property: "og:description", content: "Sign in to manage your store's packing videos." },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup" | "forgot";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [msg, setMsg] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "signin") navigate({ to: "/app" });
    else if (mode === "signup") setMsg("Check your inbox to verify your email, then sign in.");
    else setMsg("If that email has an account, a reset link is on its way.");
  }

  return (
    <div className="bg-gradient-primary flex min-h-screen items-center justify-center px-6 py-16">
      <Card className="w-full max-w-md">
        <div className="mb-8"><Logo width={130} /></div>
        <CardTitle>{mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Reset password"}</CardTitle>
        <form className="mt-6 flex flex-col gap-4" onSubmit={submit}>
          {mode === "signup" && <label><span className="field-label">Full name</span><input className="field" required maxLength={100} /></label>}
          <label><span className="field-label">Email</span><input type="email" className="field" required /></label>
          {mode !== "forgot" && <label><span className="field-label">Password</span><input type="password" className="field" required minLength={8} /></label>}
          <div><Button type="submit"><LogIn className="h-4 w-4" aria-hidden />{mode === "signin" ? "Sign in" : mode === "signup" ? "Sign up" : "Send reset link"}</Button></div>
          {msg && <p role="status">{msg}</p>}
        </form>
        <div className="mt-6 flex flex-wrap gap-4">
          {mode !== "signin" && <button className="btn-link" onClick={() => { setMode("signin"); setMsg(""); }}>Sign in</button>}
          {mode !== "signup" && <button className="btn-link" onClick={() => { setMode("signup"); setMsg(""); }}>Create account</button>}
          {mode !== "forgot" && <button className="btn-link" onClick={() => { setMode("forgot"); setMsg(""); }}>Forgot password</button>}
        </div>
        <p className="text-fine mt-6">Demo mode: any email and password will open the app.</p>
      </Card>
    </div>
  );
}
