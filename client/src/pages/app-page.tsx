import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { PerplexityAttribution } from "@/components/PerplexityAttribution";
import type { Profile } from "@shared/schema";

interface Source {
  citationLabel: string;
  lawId: string;
  articleNumber: string | null;
  subject: string | null;
  category: string | null;
  excerpt: string;
}

interface AskResponse {
  answer: string;
  citations: string[];
  sources: Source[];
  error?: string;
}

export default function AppPage() {
  const [, navigate] = useLocation();
  const [question, setQuestion] = useState("");
  const [lang, setLang] = useState("auto");
  const [citationVerification, setCitationVerification] = useState(false);
  const [result, setResult] = useState<AskResponse | null>(null);

  const { data: profile, isLoading: profileLoading, error: profileError } = useQuery<Profile>({
    queryKey: ["/api/profile"],
    retry: false,
  });

  // Redirect to auth if not logged in
  useEffect(() => {
    if (profileError) {
      navigate("/auth");
    }
  }, [profileError, navigate]);

  // Check paywall
  useEffect(() => {
    if (profile && profile.subscriptionStatus !== "active" && profile.freeQuestionsRemaining <= 0) {
      navigate("/paywall");
    }
  }, [profile, navigate]);

  const askMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ask", {
        question: question.trim(),
        lang,
        citationVerification,
      });
      return res.json() as Promise<AskResponse>;
    },
    onSuccess: (data) => {
      if (data.error === "paywall") {
        navigate("/paywall");
        return;
      }
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
    },
    onError: () => {
      setResult({
        answer: "An error occurred. Please try again.",
        citations: [],
        sources: [],
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      queryClient.clear();
      navigate("/");
    },
  });

  const handleSubmit = () => {
    if (!question.trim() || askMutation.isPending) return;
    setResult(null);
    askMutation.mutate();
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground text-sm animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="grain-overlay" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-border/50">
        <button onClick={() => navigate("/")} className="font-serif text-xl font-semibold text-foreground hover:opacity-70 transition-opacity">
          Case Map
        </button>
        <div className="flex items-center gap-4">
          {profile.subscriptionStatus !== "active" && (
            <span className="text-xs text-muted-foreground">
              {profile.freeQuestionsRemaining} free question{profile.freeQuestionsRemaining !== 1 ? "s" : ""} remaining
            </span>
          )}
          {profile.subscriptionStatus === "active" && (
            <span className="text-xs text-green-700 dark:text-green-400">Pro</span>
          )}
          <span className="text-xs text-muted-foreground">{profile.email}</span>
          <button
            onClick={() => logoutMutation.mutate()}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 flex-1 flex flex-col lg:flex-row max-w-7xl mx-auto w-full">
        {/* Left: Input + Answer */}
        <div className="flex-1 flex flex-col p-6 lg:p-8 min-w-0">
          <div className="mb-6">
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Describe the case or ask a legal question..."
              className="w-full h-32 p-4 bg-card border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground/60 resize-none focus:outline-none focus:ring-1 focus:ring-ring transition-shadow"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
              }}
            />
            <div className="flex items-center justify-between mt-3 gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <select
                  value={lang}
                  onChange={(e) => setLang(e.target.value)}
                  className="text-xs bg-card border border-border rounded px-2 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="auto">Auto</option>
                  <option value="ar">العربية</option>
                  <option value="fr">Fran&#231;ais</option>
                  <option value="en">English</option>
                </select>

                <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={citationVerification}
                    onChange={(e) => setCitationVerification(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-ring w-3.5 h-3.5"
                  />
                  Citation excerpts
                </label>
              </div>

              <button
                onClick={handleSubmit}
                disabled={!question.trim() || askMutation.isPending}
                className="px-6 py-2 bg-primary text-primary-foreground text-xs font-medium tracking-widest uppercase rounded-md hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {askMutation.isPending ? "Analyzing..." : "Analyze"}
              </button>
            </div>
          </div>

          {askMutation.isPending && (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                <p className="text-sm text-muted-foreground">Searching Lebanese legal database...</p>
              </div>
            </div>
          )}

          {result && !askMutation.isPending && (
            <div className="flex-1 overflow-auto">
              <div className="bg-card border border-border rounded-md p-6 answer-content">
                <h2 className="font-serif text-lg font-semibold text-foreground mb-4">Analysis</h2>
                <div
                  className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{
                    __html: formatMarkdown(result.answer),
                  }}
                />
              </div>
            </div>
          )}

          {!result && !askMutation.isPending && (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm text-muted-foreground/50 text-center max-w-sm">
                Ask a question about Lebanese law. The system will search through the legal database and provide a grounded analysis with citations.
              </p>
            </div>
          )}
        </div>

        {/* Right: Sources panel */}
        <aside className="w-full lg:w-80 xl:w-96 border-t lg:border-t-0 lg:border-l border-border/50 bg-card/30 p-6 lg:p-6 overflow-auto">
          <h3 className="font-serif text-sm font-semibold text-foreground mb-4 uppercase tracking-wider">Sources</h3>
          {result && result.sources && result.sources.length > 0 ? (
            <div className="space-y-3">
              {result.sources.map((source, i) => (
                <div key={i} className="p-3 bg-background border border-border/60 rounded-md">
                  <p className="text-xs font-medium text-foreground mb-1">{source.citationLabel}</p>
                  {source.category && (
                    <span className="inline-block text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded mb-1.5">
                      {source.category}
                    </span>
                  )}
                  {source.subject && (
                    <p className="text-[11px] text-muted-foreground mb-1">{source.subject}</p>
                  )}
                  <p className="text-[11px] text-muted-foreground/80 leading-relaxed">{source.excerpt}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground/50">
              Sources will appear here after you analyze a question.
            </p>
          )}
        </aside>
      </main>

      <footer className="relative z-10 border-t border-border/30 py-3 px-6 flex flex-col items-center gap-1.5">
        <p className="text-[10px] text-muted-foreground/50 text-center">
          Not legal advice. For informational use by legal professionals. Case Map does not replace qualified legal counsel.
        </p>
        <PerplexityAttribution />
      </footer>
    </div>
  );
}

function formatMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h2>$1</h2>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>')
    .replace(/^/, '<p>')
    .replace(/$/, '</p>');
}
