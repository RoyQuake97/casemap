import { useLocation } from "wouter";
import { PerplexityAttribution } from "@/components/PerplexityAttribution";

export default function PaywallPage() {
  const [, navigate] = useLocation();

  const handleSubscribe = () => {
    // In production, this would create a Stripe checkout session
    // For now, show a message that Stripe needs to be configured
    alert("Stripe integration requires configuration. Set STRIPE_SECRET_KEY and STRIPE_PRICE_ID environment variables to enable payments.");
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-background overflow-hidden">
      {/* Grain */}
      <div className="grain-overlay" />

      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-secondary/20" />

      {/* Content */}
      <main className="relative z-10 flex flex-col items-center text-center px-6 max-w-lg">
        {/* Brand */}
        <button
          onClick={() => navigate("/")}
          className="font-serif text-2xl font-semibold text-foreground mb-12 hover:opacity-70 transition-opacity"
          data-testid="nav-home-paywall"
        >
          Case Map
        </button>

        {/* Lock icon */}
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-6 animate-fade-in-up">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>

        <h1 className="font-serif text-3xl md:text-4xl font-semibold text-foreground animate-fade-in-up-delay" data-testid="text-paywall-title">
          Your free question has been used.
        </h1>

        <p className="mt-4 text-base text-muted-foreground animate-fade-in-up-delay-2">
          Subscribe to continue using Case Map for unlimited legal research.
        </p>

        <button
          data-testid="button-subscribe"
          onClick={handleSubscribe}
          className="mt-8 px-10 py-3.5 bg-primary text-primary-foreground text-sm font-medium tracking-widest uppercase rounded-md hover:opacity-90 transition-opacity animate-fade-in-up-delay-2"
        >
          Subscribe
        </button>

        <p className="mt-6 text-xs text-muted-foreground/60 max-w-xs animate-fade-in-up-delay-3">
          Secure payment via Stripe. Cancel anytime. Your legal research stays private and encrypted.
        </p>
      </main>

      {/* Footer */}
      <footer className="absolute bottom-0 w-full py-4 px-6 flex flex-col items-center gap-2">
        <p className="text-[10px] text-muted-foreground/50 max-w-md text-center">
          Not legal advice. For informational use by legal professionals.
        </p>
        <PerplexityAttribution />
      </footer>
    </div>
  );
}
