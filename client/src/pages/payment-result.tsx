import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";

export default function PaymentResultPage() {
  const [, navigate] = useLocation();
  const [status, setStatus] = useState<"checking" | "success" | "failed">("checking");

  useEffect(() => {
    // Get tap_id from the URL search params
    const hash = window.location.hash; // e.g. #/payment-result?tap_id=chg_xxx
    const searchPart = hash.split("?")[1];
    const params = new URLSearchParams(searchPart || "");
    const chargeId = params.get("tap_id");

    if (!chargeId) {
      setStatus("failed");
      return;
    }

    // Verify the charge with our backend
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
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-background overflow-hidden">
      <div className="grain-overlay" />
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-secondary/20" />

      <main className="relative z-10 flex flex-col items-center text-center px-6 max-w-md">
        {status === "checking" && (
          <>
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mb-6" role="status" aria-label="Verifying" />
            <h1 className="font-serif text-2xl font-semibold text-foreground">Verifying payment...</h1>
            <p className="mt-3 text-sm text-muted-foreground">Please wait while we confirm your subscription.</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-6 animate-fade-in-up">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-600 dark:text-green-400">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h1 className="font-serif text-3xl font-semibold text-foreground animate-fade-in-up-delay">
              Subscription activated!
            </h1>
            <p className="mt-3 text-sm text-muted-foreground animate-fade-in-up-delay-2">
              You now have unlimited access to Case Map legal research.
            </p>
            <button
              onClick={() => navigate("/app")}
              className="mt-8 px-8 py-3 bg-primary text-primary-foreground text-sm font-medium tracking-widest uppercase rounded-md hover:opacity-90 transition-opacity animate-fade-in-up-delay-3"
            >
              Start researching
            </button>
          </>
        )}

        {status === "failed" && (
          <>
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-6 animate-fade-in-up">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-600 dark:text-red-400">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </div>
            <h1 className="font-serif text-3xl font-semibold text-foreground animate-fade-in-up-delay">
              Payment not completed
            </h1>
            <p className="mt-3 text-sm text-muted-foreground animate-fade-in-up-delay-2">
              The payment was not processed. No charges were made. You can try again.
            </p>
            <div className="flex gap-3 mt-8 animate-fade-in-up-delay-3">
              <button
                onClick={() => navigate("/paywall")}
                className="px-6 py-3 bg-primary text-primary-foreground text-sm font-medium tracking-widest uppercase rounded-md hover:opacity-90 transition-opacity"
              >
                Try again
              </button>
              <button
                onClick={() => navigate("/app")}
                className="px-6 py-3 bg-card border border-border text-foreground text-sm font-medium tracking-widest uppercase rounded-md hover:opacity-90 transition-opacity"
              >
                Go back
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
