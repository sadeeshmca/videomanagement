import { LogIn } from "lucide-react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button, Card, CardTitle, Logo } from "@/design-system/design-system-updated-53e58f";
import { useAuth } from "@/lib/auth-context";

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
  const { login, register } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "signin") {
        await login(email, password);
        navigate({ to: "/app" });
      } else if (mode === "signup") {
        await register(email, password, fullName);
        navigate({ to: "/app" });
      } else {
        setMsg("If that email has an account, a reset link is on its way.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-gradient-primary flex min-h-screen items-center justify-center px-6 py-16">
      <Card className="w-full max-w-md">
        <div className="mb-8"><Logo width={130} /></div>
        <CardTitle>{mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Reset password"}</CardTitle>
        <form className="mt-6 flex flex-col gap-4" onSubmit={submit}>
          {mode === "signup" && <label><span className="field-label">Full name</span><input className="field" required maxLength={100} value={fullName} onChange={(e) => setFullName(e.target.value)} /></label>}
          <label><span className="field-label">Email</span><input type="email" className="field" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          {mode !== "forgot" && <label><span className="field-label">Password</span><input type="password" className="field" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} /></label>}
          <div><Button type="submit" disabled={loading}><LogIn className="h-4 w-4" aria-hidden />{mode === "signin" ? "Sign in" : mode === "signup" ? "Sign up" : "Send reset link"}</Button></div>
          {error && <p role="alert" className="text-red-600">{error}</p>}
          {msg && <p role="status">{msg}</p>}
        </form>
        <div className="mt-6 flex flex-wrap gap-4">
          {mode !== "signin" && <button className="btn-link" onClick={() => { setMode("signin"); setMsg(""); setError(""); }}>Sign in</button>}
          {mode !== "signup" && <button className="btn-link" onClick={() => { setMode("signup"); setMsg(""); setError(""); }}>Create account</button>}
          {mode !== "forgot" && <button className="btn-link" onClick={() => { setMode("forgot"); setMsg(""); setError(""); }}>Forgot password</button>}
        </div>
      </Card>
    </div>
  );
}
