import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("App error:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6">
          <h1 className="font-serif text-2xl font-semibold text-foreground mb-3">Something went wrong</h1>
          <p className="text-sm text-muted-foreground mb-6">An unexpected error occurred. Please refresh to try again.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 bg-primary text-primary-foreground text-sm font-medium tracking-widest uppercase rounded-md hover:opacity-90 transition-opacity"
          >
            Refresh
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
