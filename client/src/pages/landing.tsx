import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { Profile } from "@shared/schema";

const features = [
  {
    title: "Comprehensive Database",
    description: "289+ Lebanese laws covering Constitutional, Civil, Criminal, Commercial, and Procedural domains",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
  },
  {
    title: "AI-Powered Analysis",
    description: "Get structured legal analysis with cited sources, case law, and actionable next steps",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
  },
  {
    title: "Multilingual Support",
    description: "Ask questions and receive answers in Arabic, French, or English",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
  },
];

export default function LandingPage() {
  const [, navigate] = useLocation();

  const { data: profile } = useQuery<Profile>({
    queryKey: ["/api/profile"],
    retry: false,
  });

  const isLoggedIn = !!profile;

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden">
      <div className="grain-overlay" />

      {/* Background orbs */}
      <div className="orb w-[500px] h-[500px] bg-[hsl(var(--gold)/0.06)] top-[-100px] right-[-100px] animate-pulse-glow" />
      <div className="orb w-[400px] h-[400px] bg-[hsl(var(--primary)/0.04)] bottom-[10%] left-[-80px] animate-pulse-glow" style={{ animationDelay: "2s" }} />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 md:px-12 py-5">
        <span className="font-serif text-xl font-semibold text-foreground tracking-tight">Case Map</span>
        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            <>
              <button onClick={() => navigate("/app")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Dashboard
              </button>
              <button onClick={() => navigate("/profile")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Profile
              </button>
            </>
          ) : (
            <>
              <button onClick={() => navigate("/auth")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Sign in
              </button>
              <button onClick={() => navigate("/auth")} className="btn-primary !py-2 !px-5 !text-xs">
                Get started
              </button>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="max-w-3xl mx-auto">
          {/* Gold accent line */}
          <div className="w-12 h-0.5 gold-accent mx-auto mb-8 animate-fade-in-up" />

          <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-semibold tracking-tight text-foreground leading-[1.1] animate-fade-in-up-delay">
            Lebanese Law,<br />
            <span className="text-[hsl(var(--primary)/0.7)]">Mapped to Your Case</span>
          </h1>

          <p className="mt-6 text-lg md:text-xl text-muted-foreground font-light max-w-xl mx-auto leading-relaxed animate-fade-in-up-delay-2">
            AI-powered legal research grounded in Lebanese legislation, court decisions, and case law.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up-delay-3">
            {isLoggedIn ? (
              <button onClick={() => navigate("/app")} className="btn-primary">
                Go to dashboard
              </button>
            ) : (
              <>
                <button onClick={() => navigate("/auth")} className="btn-primary">
                  Start for free
                </button>
                <p className="text-xs text-muted-foreground/70">One free question, no credit card</p>
              </>
            )}
          </div>
        </div>

        {/* Features */}
        <div className="mt-24 md:mt-32 max-w-4xl mx-auto w-full grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in-up-delay-4">
          {features.map((f) => (
            <div key={f.title} className="card-elevated rounded-xl p-6 text-left">
              <div className="w-10 h-10 rounded-lg bg-[hsl(var(--gold-soft))] flex items-center justify-center text-[hsl(var(--primary))] mb-4">
                {f.icon}
              </div>
              <h3 className="font-serif text-lg font-semibold text-foreground mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>

        {/* Trust badges */}
        <div className="mt-16 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground/60 animate-fade-in-up-delay-4">
          <span className="flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
            End-to-end encrypted
          </span>
          <span className="flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
            6,700+ legal provisions
          </span>
          <span className="flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
            Instant analysis
          </span>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-6 px-6 flex flex-col items-center gap-2">
        <div className="w-8 h-px bg-border/50 mb-2" />
        <p className="text-[10px] text-muted-foreground/40 max-w-md text-center leading-relaxed">
          Not legal advice. For informational use by legal professionals. Case Map does not replace qualified legal counsel.
        </p>
      </footer>
    </div>
  );
}
