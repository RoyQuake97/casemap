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
        // Redirect to Tap Payments checkout page
        window.location.href = data.redirectUrl;
      } else {
        setError("Could not create payment session. Please try again.");
      }
    },
    onError: (err: Error) => {
      setError("Payment service unavailable. Please try again later.");
    },
  });

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-background overflow-hidden">
      <div className="grain-overlay" />
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-secondary/20" />

      <main className="relative z-10 flex flex-col items-center text-center px-6 max-w-lg">
        <button
          onClick={() => navigate("/")}
          className="font-serif text-2xl font-semibold text-foreground mb-12 hover:opacity-70 transition-opacity"
        >
          Case Map
        </button>

        {/* Lock icon */}
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-6 animate-fade-in-up">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary" aria-hidden="true">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>

        <h1 className="font-serif text-3xl md:text-4xl font-semibold text-foreground animate-fade-in-up-delay">
          Your free question has been used
        </h1>

        <p className="mt-4 text-base text-muted-foreground animate-fade-in-up-delay-2">
          Subscribe for unlimited access to Case Map legal research.
        </p>

        {/* Pricing card */}
        <div className="mt-8 w-full max-w-xs bg-card border border-border rounded-lg p-6 animate-fade-in-up-delay-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Pro Plan</p>
          <p className="font-serif text-4xl font-semibold text-foreground">
            $19.99<span className="text-lg text-muted-foreground font-normal">/mo</span>
          </p>
          <ul className="mt-4 space-y-2 text-left text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-600 dark:text-green-400 shrink-0" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
              Unlimited legal questions
            </li>
            <li className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-600 dark:text-green-400 shrink-0" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
              {stats ? `${stats.laws} laws, ${stats.chunks.toLocaleString()}+ legal provisions` : "Comprehensive legal database"}
            </li>
            <li className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-600 dark:text-green-400 shrink-0" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
              Court decisions &amp; case law
            </li>
            <li className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-600 dark:text-green-400 shrink-0" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
              Arabic, French & English
            </li>
          </ul>
        </div>

        {error && (
          <p className="mt-4 text-xs text-destructive">{error}</p>
        )}

        <button
          onClick={() => subscribeMutation.mutate()}
          disabled={subscribeMutation.isPending}
          className="mt-6 px-10 py-3.5 bg-primary text-primary-foreground text-sm font-medium tracking-widest uppercase rounded-md hover:opacity-90 transition-opacity disabled:opacity-40 animate-fade-in-up-delay-2"
        >
          {subscribeMutation.isPending ? "Redirecting..." : "Subscribe now"}
        </button>

        <p className="mt-6 text-xs text-muted-foreground/60 max-w-xs animate-fade-in-up-delay-3">
          Secure payment via Tap Payments. Your legal research stays private and encrypted.
        </p>
      </main>

      <footer className="absolute bottom-0 w-full py-4 px-6 flex flex-col items-center gap-2">
        <p className="text-[10px] text-muted-foreground/50 max-w-md text-center">
          Not legal advice. For informational use by legal professionals.
        </p>
      </footer>
    </div>
  );
}
