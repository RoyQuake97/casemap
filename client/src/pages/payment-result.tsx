import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";

export default function PaymentResultPage() {
  const [, navigate] = useLocation();
  const [status, setStatus] = useState<"checking" | "success" | "failed">("checking");

  useEffect(() => {
    const hash = window.location.hash;
    const searchPart = hash.split("?")[1];
    const params = new URLSearchParams(searchPart || "");
    const chargeId = params.get("tap_id");

    if (!chargeId) {
      setStatus("failed");
      return;
    }

    fetch(`/api/payments/verify/${chargeId}`, { credentials: "include" })
      .then(res => res.json())
      .then(data => {
        if (data.status === "success") {
          setStatus("success");
          queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
        } else {
          setStatus("failed");
        }
      })
      .catch(() => setStatus("failed"));
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      <div className="grain-overlay" />
      <div className="orb w-[400px] h-[400px] bg-[hsl(var(--gold)/0.05)] top-[-80px] right-[-60px]" />

      <main className="relative z-10 flex flex-col items-center text-center px-6 max-w-md">
        {status === "checking" && (
          <div className="animate-fade-in">
            <div className="relative mb-8">
              <div className="w-12 h-12 border-2 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" role="status" aria-label="Verifying" />
            </div>
            <h1 className="font-serif text-2xl font-semibold text-foreground">Verifying payment</h1>
            <p className="mt-3 text-sm text-muted-foreground">Please wait while we confirm your subscription...</p>
          </div>
        )}

        {status === "success" && (
          <div className="animate-scale-in">
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-green-400/10 rounded-full blur-xl" />
              <div className="relative w-20 h-20 rounded-2xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center mx-auto">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-600 dark:text-green-400">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            </div>
            <h1 className="font-serif text-3xl font-semibold text-foreground">
              Welcome to Pro
            </h1>
            <p className="mt-4 text-base text-muted-foreground max-w-xs">
              Your subscription is active. You now have unlimited access to Case Map legal research.
            </p>
            <button
              onClick={() => navigate("/app")}
              className="btn-primary mt-8"
            >
              Start researching
            </button>
          </div>
        )}

        {status === "failed" && (
          <div className="animate-scale-in">
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-red-400/10 rounded-full blur-xl" />
              <div className="relative w-20 h-20 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mx-auto">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-600 dark:text-red-400">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </div>
            </div>
            <h1 className="font-serif text-3xl font-semibold text-foreground">
              Payment not completed
            </h1>
            <p className="mt-4 text-base text-muted-foreground max-w-xs">
              No charges were made. You can try again anytime.
            </p>
            <div className="flex gap-3 mt-8">
              <button
                onClick={() => navigate("/paywall")}
                className="btn-primary"
              >
                Try again
              </button>
              <button
                onClick={() => navigate("/app")}
                className="btn-secondary"
              >
                Go back
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
