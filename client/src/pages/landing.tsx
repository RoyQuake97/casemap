import { useLocation } from "wouter";

function ScalesIcon() {
  return (
    <svg
      viewBox="0 0 200 260"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-40 h-52 md:w-52 md:h-64 animate-gentle-sway"
      aria-label="Scales of justice"
      role="img"
    >
      {/* Books stack */}
      <rect x="40" y="200" width="120" height="14" rx="2" fill="hsl(30, 20%, 55%)" opacity="0.6" />
      <rect x="45" y="186" width="110" height="14" rx="2" fill="hsl(33, 18%, 62%)" opacity="0.55" />
      <rect x="50" y="172" width="100" height="14" rx="2" fill="hsl(35, 15%, 68%)" opacity="0.5" />
      <rect x="55" y="158" width="90" height="14" rx="2" fill="hsl(30, 22%, 50%)" opacity="0.5" />

      {/* Scale pillar */}
      <rect x="96" y="50" width="8" height="108" rx="2" fill="hsl(30, 20%, 35%)" opacity="0.7" />

      {/* Scale beam */}
      <line x1="30" y1="52" x2="170" y2="52" stroke="hsl(30, 20%, 35%)" strokeWidth="3" opacity="0.7" />

      {/* Scale top ornament */}
      <circle cx="100" cy="40" r="8" fill="none" stroke="hsl(30, 20%, 35%)" strokeWidth="2" opacity="0.6" />
      <circle cx="100" cy="40" r="3" fill="hsl(30, 20%, 35%)" opacity="0.5" />

      {/* Left chain */}
      <line x1="35" y1="52" x2="35" y2="80" stroke="hsl(30, 20%, 35%)" strokeWidth="1.5" opacity="0.5" />

      {/* Right chain */}
      <line x1="165" y1="52" x2="165" y2="80" stroke="hsl(30, 20%, 35%)" strokeWidth="1.5" opacity="0.5" />

      {/* Left pan */}
      <path d="M15 82 Q35 95 55 82" stroke="hsl(30, 20%, 35%)" strokeWidth="2" fill="hsl(35, 15%, 75%)" fillOpacity="0.3" />

      {/* Right pan */}
      <path d="M145 82 Q165 95 185 82" stroke="hsl(30, 20%, 35%)" strokeWidth="2" fill="hsl(35, 15%, 75%)" fillOpacity="0.3" />
    </svg>
  );
}

export default function LandingPage() {
  const [, navigate] = useLocation();

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* Grain texture */}
      <div className="grain-overlay" />

      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-secondary/30" />

      {/* Floating accent circles */}
      <div className="absolute top-20 left-10 w-64 h-64 rounded-full bg-primary/3 blur-3xl animate-float" />
      <div className="absolute bottom-20 right-10 w-80 h-80 rounded-full bg-primary/3 blur-3xl animate-float" style={{ animationDelay: "2s" }} />

      {/* Main content */}
      <main className="relative z-10 flex flex-col items-center text-center px-6 max-w-2xl">
        {/* Icon */}
        <div className="mb-6 animate-fade-in-up animate-float">
          <ScalesIcon />
        </div>

        {/* Brand */}
        <h1 className="font-serif text-5xl md:text-6xl font-semibold tracking-tight text-foreground animate-fade-in-up-delay">
          Case Map
        </h1>

        {/* Tagline */}
        <p className="mt-4 text-lg md:text-xl text-muted-foreground font-light tracking-wide animate-fade-in-up-delay-2">
          Lebanese law, mapped to your case.
        </p>

        {/* CTA */}
        <button
          data-testid="cta-start-free"
          onClick={() => navigate("/auth")}
          className="mt-10 px-8 py-3.5 bg-primary text-primary-foreground text-sm font-medium tracking-widest uppercase rounded-md hover:opacity-90 transition-opacity duration-300 animate-fade-in-up-delay-3"
        >
          Ask a free question
        </button>

        {/* Trust line */}
        <p className="mt-6 text-xs text-muted-foreground/70 max-w-sm animate-fade-in-up-delay-3">
          AI-powered legal research grounded in Lebanese legislation and case law.
          <br />One free question to explore.
        </p>
      </main>

      {/* Footer */}
      <footer className="absolute bottom-0 w-full py-4 px-6 flex flex-col items-center gap-2">
        <p className="text-[10px] text-muted-foreground/50 max-w-md text-center leading-relaxed">
          Not legal advice. For informational use by legal professionals. Case Map does not replace qualified legal counsel.
        </p>
      </footer>
    </div>
  );
}
