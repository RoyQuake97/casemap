import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import DOMPurify from "dompurify";
import type { Profile } from "@shared/schema";

interface HistoryQuery {
  id: number;
  question: string;
  answerMarkdown: string | null;
  citationsJson: unknown;
  sourcesJson: unknown;
  createdAt: string;
}

function formatMarkdownSimple(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]/g, "<em>[$1]</em>")
    .replace(/\n/g, "<br/>");
}

export default function ProfilePage() {
  const [, navigate] = useLocation();
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: profile, isLoading: profileLoading, error: profileError } = useQuery<Profile>({
    queryKey: ["/api/profile"],
    retry: false,
  });

  const { data: history, isLoading: historyLoading } = useQuery<HistoryQuery[]>({
    queryKey: ["/api/queries"],
    retry: false,
    enabled: !!profile,
  });

  const deleteMutation = useMutation({
    mutationFn: async (queryId: number) => {
      await apiRequest("DELETE", `/api/queries/${queryId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/queries"] });
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

  if (profileError) {
    navigate("/auth");
    return null;
  }

  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" role="status" aria-label="Loading" />
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const expiresAt = profile.subscriptionExpiresAt
    ? new Date(profile.subscriptionExpiresAt)
    : null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="grain-overlay" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-5 md:px-8 py-4 border-b border-border/40 bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-6">
          <button onClick={() => navigate("/")} className="font-serif text-xl font-semibold text-foreground hover:opacity-70 transition-opacity">
            Case Map
          </button>
          <div className="hidden sm:block w-px h-5 bg-border/50" />
          <span className="hidden sm:inline text-xs text-muted-foreground/60">Account</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/app")}
            className="btn-primary !py-2 !px-4 !text-[11px]"
          >
            New question
          </button>
          <button
            onClick={() => logoutMutation.mutate()}
            className="text-xs text-muted-foreground/60 hover:text-foreground transition-colors"
            title="Sign out"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </header>

      <main className="relative z-10 flex-1 max-w-4xl mx-auto w-full p-5 md:p-8">
        {/* Profile hero */}
        <div className="mb-10 animate-fade-in-up">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-lg font-semibold text-primary font-serif">
              {(profile.displayName || profile.email)[0].toUpperCase()}
            </div>
            <div>
              <h1 className="font-serif text-2xl font-semibold text-foreground">
                {profile.displayName || profile.email.split("@")[0]}
              </h1>
              <p className="text-sm text-muted-foreground">{profile.email}</p>
            </div>
          </div>

          {/* Stats cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card-elevated rounded-xl p-5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2">Plan</p>
              {profile.subscriptionStatus === "active" ? (
                <>
                  <p className="text-base font-semibold text-green-700 dark:text-green-400 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    Pro
                  </p>
                  {expiresAt && (
                    <p className="text-[11px] text-muted-foreground mt-1.5">
                      Renews {expiresAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p className="text-base font-semibold text-foreground">Free</p>
                  <button
                    onClick={() => navigate("/paywall")}
                    className="mt-2 text-xs text-[hsl(var(--gold))] hover:underline font-medium"
                  >
                    Upgrade to Pro
                  </button>
                </>
              )}
            </div>

            <div className="card-elevated rounded-xl p-5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2">Questions Asked</p>
              <p className="text-2xl font-semibold text-foreground font-serif">
                {historyLoading ? "..." : (history?.length || 0)}
              </p>
            </div>

            <div className="card-elevated rounded-xl p-5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2">
                {profile.subscriptionStatus === "active" ? "Access" : "Free Questions"}
              </p>
              <p className="text-2xl font-semibold text-foreground font-serif">
                {profile.subscriptionStatus === "active"
                  ? "Unlimited"
                  : profile.freeQuestionsRemaining}
              </p>
              {profile.subscriptionStatus !== "active" && (
                <p className="text-[11px] text-muted-foreground mt-1">remaining</p>
              )}
            </div>
          </div>
        </div>

        {/* Research history */}
        <div className="animate-fade-in-up-delay">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-serif text-xl font-semibold text-foreground">Research History</h2>
            {history && history.length > 0 && (
              <span className="text-[10px] text-muted-foreground/50 bg-muted/50 px-2 py-0.5 rounded-full">
                {history.length} queries
              </span>
            )}
          </div>

          {historyLoading && (
            <div className="flex items-center gap-3 py-12 justify-center">
              <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" role="status" aria-label="Loading" />
              <p className="text-sm text-muted-foreground">Loading history...</p>
            </div>
          )}

          {!historyLoading && (!history || history.length === 0) && (
            <div className="card-elevated rounded-xl p-10 text-center">
              <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground/40" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <p className="text-sm text-muted-foreground mb-3">No research history yet</p>
              <button
                onClick={() => navigate("/app")}
                className="text-sm text-[hsl(var(--gold))] hover:underline font-medium"
              >
                Ask your first question
              </button>
            </div>
          )}

          {history && history.length > 0 && (
            <div className="space-y-3">
              {history.map((q) => {
                const isExpanded = expandedId === q.id;
                const date = new Date(q.createdAt);
                return (
                  <div key={q.id} className="card-elevated rounded-xl overflow-hidden">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : q.id)}
                      className="w-full text-left p-5 hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground line-clamp-2 leading-relaxed">{q.question}</p>
                          <p className="text-[11px] text-muted-foreground/60 mt-2">
                            {date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            {" at "}
                            {date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                          </p>
                        </div>
                        <svg
                          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                          className={`text-muted-foreground/40 shrink-0 mt-1 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                          aria-hidden="true"
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-border/30 p-5 bg-muted/5 animate-fade-in">
                        {q.answerMarkdown ? (
                          <div
                            className="text-sm text-foreground/85 leading-relaxed prose-sm max-w-none"
                            dangerouslySetInnerHTML={{
                              __html: DOMPurify.sanitize(formatMarkdownSimple(q.answerMarkdown)),
                            }}
                          />
                        ) : (
                          <p className="text-sm text-muted-foreground italic">No answer recorded.</p>
                        )}

                        <div className="flex items-center gap-4 mt-5 pt-4 border-t border-border/20">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(q.answerMarkdown || q.question);
                            }}
                            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                            Copy
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm("Delete this question from your history?")) {
                                deleteMutation.mutate(q.id);
                              }
                            }}
                            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <footer className="relative z-10 border-t border-border/20 py-3 px-6 text-center">
        <p className="text-[10px] text-muted-foreground/35">
          Not legal advice. For informational use by legal professionals. Case Map does not replace qualified legal counsel.
        </p>
      </footer>
    </div>
  );
}
