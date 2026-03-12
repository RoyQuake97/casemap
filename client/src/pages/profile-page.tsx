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

  if (profileError) {
    navigate("/auth");
    return null;
  }

  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground text-sm animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!profile) return null;

  const memberSince = profile.subscriptionExpiresAt
    ? new Date(profile.subscriptionExpiresAt)
    : null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="grain-overlay" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-border/50">
        <button onClick={() => navigate("/")} className="font-serif text-xl font-semibold text-foreground hover:opacity-70 transition-opacity">
          Case Map
        </button>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/app")}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            New question
          </button>
          <span className="text-xs text-muted-foreground">{profile.email}</span>
        </div>
      </header>

      <main className="relative z-10 flex-1 max-w-4xl mx-auto w-full p-6 lg:p-8">
        {/* Account overview */}
        <div className="mb-8">
          <h1 className="font-serif text-2xl font-semibold text-foreground mb-6">Your Account</h1>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {/* Subscription status */}
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Plan</p>
              <p className="text-sm font-medium text-foreground">
                {profile.subscriptionStatus === "active" ? (
                  <span className="text-green-700 dark:text-green-400">Pro</span>
                ) : (
                  <span>Free</span>
                )}
              </p>
              {profile.subscriptionStatus === "active" && memberSince && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  Renews {memberSince.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
              )}
              {profile.subscriptionStatus !== "active" && (
                <button
                  onClick={() => navigate("/paywall")}
                  className="mt-2 text-xs text-primary hover:underline"
                >
                  Upgrade to Pro
                </button>
              )}
            </div>

            {/* Questions asked */}
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Questions Asked</p>
              <p className="text-sm font-medium text-foreground">
                {historyLoading ? "..." : (history?.length || 0)}
              </p>
            </div>

            {/* Free questions */}
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                {profile.subscriptionStatus === "active" ? "Access" : "Free Questions"}
              </p>
              <p className="text-sm font-medium text-foreground">
                {profile.subscriptionStatus === "active"
                  ? "Unlimited"
                  : `${profile.freeQuestionsRemaining} remaining`}
              </p>
            </div>
          </div>
        </div>

        {/* Query history */}
        <div>
          <h2 className="font-serif text-lg font-semibold text-foreground mb-4">Research History</h2>

          {historyLoading && (
            <div className="flex items-center gap-2 py-8 justify-center">
              <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" role="status" aria-label="Loading" />
              <p className="text-sm text-muted-foreground">Loading history...</p>
            </div>
          )}

          {!historyLoading && (!history || history.length === 0) && (
            <div className="bg-card border border-border rounded-lg p-8 text-center">
              <p className="text-sm text-muted-foreground mb-3">No research history yet.</p>
              <button
                onClick={() => navigate("/app")}
                className="text-xs text-primary hover:underline"
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
                  <div key={q.id} className="bg-card border border-border rounded-lg overflow-hidden">
                    {/* Question header — always visible */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : q.id)}
                      className="w-full text-left p-4 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground line-clamp-2">{q.question}</p>
                          <p className="text-[11px] text-muted-foreground mt-1">
                            {date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            {" at "}
                            {date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                          </p>
                        </div>
                        <svg
                          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                          className={`text-muted-foreground shrink-0 mt-1 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                          aria-hidden="true"
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </div>
                    </button>

                    {/* Expanded answer */}
                    {isExpanded && (
                      <div className="border-t border-border/50 p-4">
                        {q.answerMarkdown ? (
                          <div
                            className="text-sm text-foreground/90 leading-relaxed prose-sm max-w-none"
                            dangerouslySetInnerHTML={{
                              __html: DOMPurify.sanitize(formatMarkdownSimple(q.answerMarkdown)),
                            }}
                          />
                        ) : (
                          <p className="text-sm text-muted-foreground italic">No answer recorded.</p>
                        )}

                        <div className="flex items-center gap-3 mt-4 pt-3 border-t border-border/30">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(q.answerMarkdown || q.question);
                            }}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                            Copy answer
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm("Delete this question from your history?")) {
                                deleteMutation.mutate(q.id);
                              }
                            }}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
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

      <footer className="relative z-10 border-t border-border/30 py-3 px-6 flex flex-col items-center gap-1.5">
        <p className="text-[10px] text-muted-foreground/50 text-center">
          Not legal advice. For informational use by legal professionals. Case Map does not replace qualified legal counsel.
        </p>
      </footer>
    </div>
  );
}
