import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function PaywallPage() {
  const [, navigate] = useLocation();
  const [error, setError] = useState("");

  const { data: stats } = useQuery<{ laws: number; chunks: number }>({
    queryKey: ["/api/stats"],
    staleTime: 60_000,
  });

  const subscribeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/payments/create-charge");
      return res.json();
    },
    onSuccess: (data) => {
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        setError("Could not create payment session. Please try again.");
      }
    },
    onError: () => {
      setError("Payment service unavailable. Please try again later.");
    },
  });

  const features = [
    "Unlimited legal questions",
    stats ? `${stats.laws} laws, ${stats.chunks.toLocaleString()}+ legal provisions` : "Comprehensive legal database",
    "Court decisions & case law",
    "Arabic, French & English",
    "Export analysis as PDF",
    "Full research history",
  ];

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      <div className="grain-overlay" />

      {/* Background orbs */}
      <div className="orb w-[400px] h-[400px] bg-[hsl(var(--gold)/0.06)] top-[-80px] right-[-60px] animate-pulse-glow" />
      <div className="orb w-[300px] h-[300px] bg-[hsl(var(--primary)/0.04)] bottom-[10%] left-[-60px] animate-pulse-glow" style={{ animationDelay: "2s" }} />

      <main className="relative z-10 flex flex-col items-center text-center px-6 max-w-lg w-full">
        <button
          onClick={() => navigate("/")}
          className="font-serif text-2xl font-semibold text-foreground mb-12 hover:opacity-70 transition-opacity"
        >
          Case Map
        </button>

        {/* Lock icon with glow */}
        <div className="relative mb-8 animate-fade-in-up">
          <div className="absolute inset-0 bg-[hsl(var(--gold)/0.15)] rounded-full blur-xl" />
          <div className="relative w-16 h-16 rounded-2xl bg-[hsl(var(--gold-soft))] flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5" aria-hidden="true">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
        </div>

        <h1 className="font-serif text-3xl md:text-4xl font-semibold text-foreground animate-fade-in-up-delay">
          Unlock Full Access
        </h1>

        <p className="mt-4 text-base text-muted-foreground max-w-sm animate-fade-in-up-delay-2">
          Your free question has been used. Subscribe to continue with unlimited legal research.
        </p>

        {/* Pricing card */}
        <div className="mt-10 w-full max-w-sm card-elevated rounded-2xl p-8 animate-fade-in-up-delay-2">
          <div className="flex items-baseline justify-center gap-1 mb-1">
            <span className="font-serif text-5xl font-semibold text-foreground">$19.99</span>
            <span className="text-lg text-muted-foreground">/mo</span>
          </div>
          <p className="text-xs text-muted-foreground mb-6">Cancel anytime</p>

          <div className="w-full h-px bg-border/50 mb-6" />

          <ul className="space-y-3 text-left mb-8">
            {features.map((f, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-foreground/80">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-600 dark:text-green-400 shrink-0 mt-0.5" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {f}
              </li>
            ))}
          </ul>

          {error && (
            <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/5 border border-destructive/10 rounded-lg px-3 py-2.5 mb-4">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="shrink-0">
                <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              {error}
            </div>
          )}

          <button
            onClick={() => subscribeMutation.mutate()}
            disabled={subscribeMutation.isPending}
            className="btn-primary w-full"
          >
            {subscribeMutation.isPending ? "Redirecting to payment..." : "Subscribe now"}
          </button>
        </div>

        <div className="mt-6 flex items-center gap-4 text-[11px] text-muted-foreground/50 animate-fade-in-up-delay-3">
          <span className="flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
            Secure payment
          </span>
          <span className="w-px h-3 bg-border/30" />
          <span>via Tap Payments</span>
        </div>

        <button
          onClick={() => navigate("/app")}
          className="mt-6 text-xs text-muted-foreground hover:text-foreground transition-colors animate-fade-in-up-delay-3"
        >
          Go back
        </button>
      </main>

      <footer className="absolute bottom-0 w-full py-5 px-6 flex flex-col items-center">
        <p className="text-[10px] text-muted-foreground/35 max-w-md text-center">
          Not legal advice. For informational use by legal professionals.
        </p>
      </footer>
    </div>
  );
}
