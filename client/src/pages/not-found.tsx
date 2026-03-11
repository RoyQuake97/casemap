import { useLocation } from "wouter";

export default function NotFound() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-center px-6">
      <h1 className="font-serif text-4xl font-semibold text-foreground mb-4">404</h1>
      <p className="text-muted-foreground mb-8">Page not found.</p>
      <button
        onClick={() => navigate("/")}
        className="px-6 py-2.5 bg-primary text-primary-foreground text-xs font-medium tracking-widest uppercase rounded-md hover:opacity-90 transition-opacity"
        data-testid="button-go-home"
      >
        Go Home
      </button>
    </div>
  );
}
