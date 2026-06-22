import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { z } from "zod";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FinoraWordmark } from "@/components/finora/logo";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const AuthSearch = z.object({
  mode: z.enum(["signin", "signup"]).optional(),
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Finora" },
      { name: "description", content: "Sign in or create your Finora account." },
    ],
  }),
  validateSearch: (search) => AuthSearch.parse(search),
  component: AuthPage,
});

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">(search.mode ?? "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/app", replace: true });
    });
  }, [navigate]);

  function friendlyError(msg: string): string {
    const m = msg.toLowerCase();
    if (m.includes("invalid login") || m.includes("invalid credentials"))
      return "That email and password don't match. Try again or create an account.";
    if (m.includes("already registered") || m.includes("already been registered") || m.includes("user already"))
      return "You already have an account — sign in instead.";
    if (m.includes("email not confirmed"))
      return "Please confirm your email first, then sign in.";
    if (m.includes("password") && m.includes("pwned"))
      return "That password has been found in a data breach. Please choose a different one.";
    if (m.includes("password") && m.includes("6"))
      return "Password must be at least 8 characters.";
    if (m.includes("rate limit") || m.includes("too many"))
      return "Too many attempts — wait a moment and try again.";
    if (m.includes("network") || m.includes("fetch"))
      return "Network hiccup. Check your connection and try again.";
    return msg;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: name.trim() || email.split("@")[0] },
            emailRedirectTo: window.location.origin + "/app",
          },
        });
        if (error) throw error;
        if (!data.session) {
          toast.success("Check your email to confirm your account, then sign in.");
          setMode("signin");
          setPassword("");
          return;
        }
        toast.success("Karibu! Let's set you up.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        toast.success("Sawa, welcome back.");
      }
      navigate({ to: "/app", replace: true });
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Something went wrong";
      toast.error(friendlyError(raw));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setOauthLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + "/app",
      });
      if (result.error) {
        toast.error(friendlyError(result.error.message || "Google sign-in failed"));
        return;
      }
      if (result.redirected) return;
      navigate({ to: "/app", replace: true });
    } catch (err) {
      toast.error(friendlyError(err instanceof Error ? err.message : "Google sign-in failed"));
    } finally {
      setOauthLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-paper">
      <div className="mx-auto flex h-20 w-full max-w-6xl items-center px-5 sm:px-8">
        <Link to="/"><FinoraWordmark /></Link>
      </div>
      <div className="mx-auto w-full max-w-md px-5 pb-16 pt-4 sm:px-8">
        <div className="rounded-3xl border border-border bg-card p-7 shadow-sm">
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            {mode === "signup" ? "Karibu Finora" : "Welcome back"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "signup"
              ? "Let's get you a coach in your corner."
              : "Your coach is ready when you are."}
          </p>

          <Button
            type="button"
            variant="outline"
            className="mt-6 w-full rounded-full"
            onClick={handleGoogle}
            disabled={oauthLoading || loading}
          >
            {oauthLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <GoogleIcon />
            )}
            Continue with Google
          </Button>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            or
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="name">First name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Wanjiku"
                  autoComplete="given-name"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
              />
            </div>
            <Button type="submit" className="w-full rounded-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "signup" ? "Create my account" : "Sign in"}
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            {mode === "signup" ? "Already with us?" : "New to Finora?"}{" "}
            <button
              type="button"
              className="font-medium text-primary hover:underline"
              onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
            >
              {mode === "signup" ? "Sign in" : "Create an account"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.6 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 5.1 29.3 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.2-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16.1 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 5.1 29.3 3 24 3 16.1 3 9.3 7.6 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 45c5.2 0 9.9-2 13.5-5.2l-6.2-5.3C29.3 36 26.8 37 24 37c-5.3 0-9.7-3.4-11.3-8.1l-6.5 5C9.2 40.4 16 45 24 45z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.6l6.2 5.3C40.8 35.9 45 30.5 45 24c0-1.2-.1-2.4-.4-3.5z" />
    </svg>
  );
}
