import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Profile } from "@shared/schema";

export default function AuthPage() {
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");

  // Redirect if already logged in
  const { data: profile } = useQuery<Profile>({
    queryKey: ["/api/profile"],
    retry: false,
  });

  useEffect(() => {
    if (profile) navigate("/app");
  }, [profile, navigate]);

  const authMutation = useMutation({
    mutationFn: async () => {
      const url = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body = mode === "login"
        ? { email, password }
        : { email, password, displayName: displayName || undefined };
      const res = await apiRequest("POST", url, body);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      navigate("/app");
    },
    onError: (err: Error) => {
      const msg = err.message;
      try {
        const parsed = JSON.parse(msg.replace(/^\d+:\s*/, ""));
        setError(parsed.message || "Something went wrong");
      } catch {
        setError(msg || "Something went wrong");
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Email and password are required");
      return;
    }
    if (mode === "register" && password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    authMutation.mutate();
  };

  return (
    <div className="relative min-h-screen flex overflow-hidden">
      <div className="grain-overlay" />

      {/* Left decorative panel — hidden on mobile */}
      <div className="hidden lg:flex lg:w-[45%] relative bg-[hsl(var(--primary))] items-center justify-center overflow-hidden">
        <div className="orb w-[300px] h-[300px] bg-[hsl(38,60%,50%,0.1)] top-[10%] right-[-50px]" />
        <div className="orb w-[250px] h-[250px] bg-[hsl(38,60%,50%,0.08)] bottom-[15%] left-[-40px]" />

        <div className="relative z-10 max-w-md px-12 text-[hsl(var(--primary-foreground))]">
          <div className="w-10 h-0.5 bg-[hsl(var(--gold)/0.6)] mb-8" />
          <h2 className="font-serif text-4xl font-semibold leading-tight mb-6">
            Lebanese Legal Research, Reimagined
          </h2>
          <p className="text-base opacity-70 leading-relaxed mb-10">
            Access 289+ laws, 6,700+ legal provisions, and AI-powered analysis grounded in Lebanese legislation and case law.
          </p>
          <div className="space-y-4 text-sm opacity-60">
            <div className="flex items-center gap-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
              Structured legal analysis with citations
            </div>
            <div className="flex items-center gap-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
              Arabic, French, and English support
            </div>
            <div className="flex items-center gap-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
              Export analysis as PDF
            </div>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative">
        <div className="orb w-[300px] h-[300px] bg-[hsl(var(--gold)/0.05)] top-[-50px] right-[-50px]" />

        <div className="w-full max-w-sm relative z-10">
          <button
            onClick={() => navigate("/")}
            className="font-serif text-2xl font-semibold text-foreground mb-2 hover:opacity-70 transition-opacity block"
          >
            Case Map
          </button>
          <div className="w-8 h-0.5 gold-accent mb-10" />

          <h1 className="font-serif text-3xl font-semibold text-foreground mb-2 animate-fade-in-up">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-sm text-muted-foreground mb-8 animate-fade-in-up-delay">
            {mode === "login"
              ? "Sign in to continue your legal research"
              : "Start with one free legal question"}
          </p>

          <form onSubmit={handleSubmit} className="w-full space-y-4 animate-fade-in-up-delay-2">
            {mode === "register" && (
              <input
                type="text"
                placeholder="Display name (optional)"
                aria-label="Display name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="input-field"
              />
            )}
            <input
              type="email"
              placeholder="Email address"
              aria-label="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="input-field"
            />
            <input
              type="password"
              placeholder={mode === "register" ? "Password (8+ characters)" : "Password"}
              aria-label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="input-field"
            />

            {error && (
              <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/5 border border-destructive/10 rounded-lg px-3 py-2.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="shrink-0">
                  <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                {error}
              </div>
            )}

            <button type="submit" disabled={authMutation.isPending} className="btn-primary w-full">
              {authMutation.isPending
                ? "Please wait..."
                : mode === "login"
                ? "Sign in"
                : "Create account"}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setError("");
              }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {mode === "login"
                ? "Don't have an account? Create one"
                : "Already have an account? Sign in"}
            </button>
          </div>
        </div>

        <p className="absolute bottom-6 text-[10px] text-muted-foreground/40 max-w-xs text-center">
          Not legal advice. For informational use by legal professionals.
        </p>
      </div>
    </div>
  );
}
