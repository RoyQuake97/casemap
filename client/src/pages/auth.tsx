import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { PerplexityAttribution } from "@/components/PerplexityAttribution";

export default function AuthPage() {
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");

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
    if (mode === "register" && password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    authMutation.mutate();
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-background overflow-hidden">
      <div className="grain-overlay" />
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-secondary/20" />

      <main className="relative z-10 flex flex-col items-center text-center px-6 w-full max-w-sm">
        <button
          onClick={() => navigate("/")}
          className="font-serif text-2xl font-semibold text-foreground mb-10 hover:opacity-70 transition-opacity"
        >
          Case Map
        </button>

        <h1 className="font-serif text-3xl font-semibold text-foreground mb-2 animate-fade-in-up">
          {mode === "login" ? "Welcome back" : "Create account"}
        </h1>
        <p className="text-sm text-muted-foreground mb-8 animate-fade-in-up-delay">
          {mode === "login"
            ? "Sign in to continue your legal research"
            : "Get started with one free legal question"}
        </p>

        <form onSubmit={handleSubmit} className="w-full space-y-4 animate-fade-in-up-delay-2">
          {mode === "register" && (
            <input
              type="text"
              placeholder="Display name (optional)"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-3 bg-card border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring"
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 bg-card border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full px-4 py-3 bg-card border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring"
          />

          {error && (
            <p className="text-xs text-destructive text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={authMutation.isPending}
            className="w-full px-6 py-3 bg-primary text-primary-foreground text-sm font-medium tracking-widest uppercase rounded-md hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {authMutation.isPending
              ? "Please wait..."
              : mode === "login"
              ? "Sign in"
              : "Create account"}
          </button>
        </form>

        <button
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setError("");
          }}
          className="mt-6 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {mode === "login"
            ? "Don't have an account? Create one"
            : "Already have an account? Sign in"}
        </button>
      </main>

      <footer className="absolute bottom-0 w-full py-4 px-6 flex flex-col items-center gap-2">
        <p className="text-[10px] text-muted-foreground/50 max-w-md text-center">
          Not legal advice. For informational use by legal professionals.
        </p>
        <PerplexityAttribution />
      </footer>
    </div>
  );
}
