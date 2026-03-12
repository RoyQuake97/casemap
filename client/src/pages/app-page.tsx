import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import DOMPurify from "dompurify";
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
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const { data: profile, isLoading: profileLoading, error: profileError } = useQuery<Profile>({
    queryKey: ["/api/profile"],
    retry: false,
  });

  useEffect(() => {
    if (profileError) navigate("/auth");
  }, [profileError, navigate]);

  useEffect(() => {
    if (profile && profile.subscriptionStatus !== "active" && profile.freeQuestionsRemaining <= 0 && !result) {
      navigate("/paywall");
    }
  }, [profile, navigate, result]);

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
    if (profile && profile.subscriptionStatus !== "active" && profile.freeQuestionsRemaining <= 0) {
      navigate("/paywall");
      return;
    }
    setResult(null);
    setSourcesOpen(false);
    askMutation.mutate();
  };

  const handleExportPDF = () => {
    if (!result) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow pop-ups to export PDF.");
      return;
    }

    const esc = (str: string) => str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

    const sourcesHtml = result.sources.map(s => `
      <div style="border:1px solid #ddd; border-radius:8px; padding:14px; margin-bottom:10px;">
        <p style="font-weight:600; font-size:12px; margin:0 0 4px 0;">${esc(s.citationLabel)}</p>
        ${s.category ? `<span style="font-size:10px; background:#f0f0f0; padding:2px 8px; border-radius:4px;">${esc(s.category)}</span>` : ""}
        ${s.subject ? `<p style="font-size:11px; color:#666; margin:4px 0;">${esc(s.subject)}</p>` : ""}
        <p style="font-size:11px; color:#888; line-height:1.5;">${esc(s.excerpt)}</p>
      </div>
    `).join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Case Map - Legal Analysis</title>
        <style>
          body { font-family: 'Georgia', serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #333; }
          .header { border-bottom: 2px solid #3d2a1a; padding-bottom: 16px; margin-bottom: 24px; }
          .header h1 { font-size: 24px; color: #3d2a1a; margin: 0; }
          .header p { font-size: 12px; color: #888; margin: 4px 0 0 0; }
          .question { background: #f9f7f4; border-left: 3px solid #3d2a1a; padding: 14px 18px; margin-bottom: 24px; font-style: italic; }
          .answer { line-height: 1.8; font-size: 14px; }
          .answer h2, .answer h3 { color: #3d2a1a; }
          .answer strong { color: #333; }
          .answer ul, .answer ol { margin: 8px 0; padding-left: 24px; }
          .answer li { margin-bottom: 4px; }
          .sources-title { font-size: 16px; color: #3d2a1a; border-top: 1px solid #ddd; padding-top: 20px; margin-top: 30px; }
          .disclaimer { font-size: 10px; color: #aaa; text-align: center; border-top: 1px solid #eee; padding-top: 16px; margin-top: 40px; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Case Map</h1>
          <p>Lebanese Legal Analysis &mdash; ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
        </div>
        <div class="question">${esc(question)}</div>
        <div class="answer">${DOMPurify.sanitize(formatMarkdown(result.answer))}</div>
        ${result.sources.length > 0 ? `<h3 class="sources-title">Sources</h3>${sourcesHtml}` : ""}
        <p class="disclaimer">Not legal advice. For informational use by legal professionals. Case Map does not replace qualified legal counsel.</p>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

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
          <span className="hidden sm:inline text-xs text-muted-foreground/60">Legal Research</span>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          {profile.subscriptionStatus === "active" ? (
            <span className="text-[11px] font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2.5 py-1 rounded-full">
              Pro
            </span>
          ) : (
            <button
              onClick={() => navigate("/paywall")}
              className="text-[11px] text-muted-foreground hover:text-foreground bg-[hsl(var(--gold-soft))] px-2.5 py-1 rounded-full transition-colors"
            >
              {profile.freeQuestionsRemaining} free left
            </button>
          )}

          <button
            onClick={() => navigate("/profile")}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-medium text-primary">
              {(profile.displayName || profile.email)[0].toUpperCase()}
            </div>
            <span className="hidden md:inline">{profile.email}</span>
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

      {/* Main content */}
      <main className="relative z-10 flex-1 flex flex-col lg:flex-row max-w-[1400px] mx-auto w-full">
        {/* Left: Input + Answer */}
        <div className="flex-1 flex flex-col p-5 md:p-8 min-w-0">
          {/* Input area */}
          <div className="mb-6">
            <div className="card-elevated rounded-xl overflow-hidden">
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Describe your case or ask a legal question about Lebanese law..."
                aria-label="Legal question"
                className="w-full h-36 p-5 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none leading-relaxed"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
                }}
              />
              <div className="flex items-center justify-between px-5 py-3 border-t border-border/30 bg-muted/20">
                <div className="flex items-center gap-3">
                  <select
                    value={lang}
                    onChange={(e) => setLang(e.target.value)}
                    aria-label="Response language"
                    className="text-xs bg-transparent border border-border/50 rounded-md px-2.5 py-1.5 text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring/30"
                  >
                    <option value="auto">Auto-detect</option>
                    <option value="ar">العربية</option>
                    <option value="fr">Fran&#231;ais</option>
                    <option value="en">English</option>
                  </select>

                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors">
                    <input
                      type="checkbox"
                      checked={citationVerification}
                      onChange={(e) => setCitationVerification(e.target.checked)}
                      className="rounded border-border text-primary focus:ring-ring w-3.5 h-3.5"
                    />
                    Cite excerpts
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <span className="hidden sm:inline text-[10px] text-muted-foreground/40">Ctrl+Enter</span>
                  <button
                    onClick={handleSubmit}
                    disabled={!question.trim() || askMutation.isPending}
                    className="btn-primary !py-2 !px-5 !text-xs flex items-center gap-2"
                  >
                    {askMutation.isPending ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        Analyze
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Loading state */}
          {askMutation.isPending && (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex flex-col items-center gap-4 animate-fade-in">
                <div className="relative">
                  <div className="w-10 h-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin" role="status" aria-label="Loading" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-3 h-3 bg-primary/20 rounded-full animate-pulse" />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">Searching legal database</p>
                  <p className="text-xs text-muted-foreground mt-1">Analyzing Lebanese legislation and case law...</p>
                </div>
              </div>
            </div>
          )}

          {/* Result */}
          {result && !askMutation.isPending && (
            <div className="flex-1 overflow-auto animate-fade-in-up" ref={printRef}>
              <div className="card-elevated rounded-xl p-6 md:p-8 answer-content">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-border/30">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[hsl(var(--gold-soft))] flex items-center justify-center">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" aria-hidden="true">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                    </div>
                    <h2 className="font-serif text-xl font-semibold text-foreground">Legal Analysis</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Mobile sources toggle */}
                    {result.sources.length > 0 && (
                      <button
                        onClick={() => setSourcesOpen(!sourcesOpen)}
                        className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground border border-border/50 rounded-lg hover:bg-muted/30 transition-colors"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                        </svg>
                        {result.sources.length} sources
                      </button>
                    )}
                    <button
                      onClick={handleExportPDF}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground border border-border/50 rounded-lg hover:bg-muted/30 transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      Export
                    </button>
                  </div>
                </div>
                <div
                  className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(formatMarkdown(result.answer)),
                  }}
                />
              </div>
            </div>
          )}

          {/* Empty state */}
          {!result && !askMutation.isPending && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-md animate-fade-in">
                <div className="w-14 h-14 rounded-2xl bg-[hsl(var(--gold-soft))] flex items-center justify-center mx-auto mb-5">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5" aria-hidden="true">
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </div>
                <h3 className="font-serif text-lg font-semibold text-foreground mb-2">Ask a Legal Question</h3>
                <p className="text-sm text-muted-foreground/60 leading-relaxed">
                  Describe your case or question about Lebanese law. The system will search across the legal database and provide a structured analysis with cited sources.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right: Sources panel — desktop always, mobile toggleable */}
        <aside className={`
          ${sourcesOpen ? "block" : "hidden"} lg:block
          w-full lg:w-80 xl:w-96 border-t lg:border-t-0 lg:border-l border-border/30
          bg-muted/10 p-5 md:p-6 overflow-auto
        `}>
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Sources</h3>
            {result?.sources && (
              <span className="text-[10px] text-muted-foreground/50 bg-muted/50 px-2 py-0.5 rounded-full">
                {result.sources.length} found
              </span>
            )}
          </div>

          {result && result.sources && result.sources.length > 0 ? (
            <div className="space-y-3">
              {result.sources.map((source, i) => (
                <div key={i} className="card-elevated rounded-lg p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-xs font-semibold text-foreground leading-snug">{source.citationLabel}</p>
                    <span className="text-[9px] text-muted-foreground/40 shrink-0">#{i + 1}</span>
                  </div>
                  {source.category && (
                    <span className="inline-block text-[10px] text-[hsl(var(--primary))] bg-[hsl(var(--gold-soft))] px-2 py-0.5 rounded-md mb-2">
                      {source.category}
                    </span>
                  )}
                  {source.subject && (
                    <p className="text-[11px] text-muted-foreground mb-2">{source.subject}</p>
                  )}
                  <p className="text-[11px] text-muted-foreground/70 leading-relaxed">{source.excerpt}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center mb-3">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground/30" aria-hidden="true">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
              </div>
              <p className="text-xs text-muted-foreground/40">
                Sources appear here after analysis
              </p>
            </div>
          )}
        </aside>
      </main>

      <footer className="relative z-10 border-t border-border/20 py-3 px-6 text-center">
        <p className="text-[10px] text-muted-foreground/35">
          Not legal advice. For informational use by legal professionals. Case Map does not replace qualified legal counsel.
        </p>
      </footer>
    </div>
  );
}

function formatMarkdown(text: string): string {
  const lines = text.split("\n");
  const html: string[] = [];
  let inUl = false;
  let inOl = false;

  for (const line of lines) {
    let processed = line
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\[([^\]]+)\]/g, "<em>[$1]</em>");

    const h3 = processed.match(/^### (.+)$/);
    const h2 = processed.match(/^##? (.+)$/);
    if (h3) {
      if (inUl) { html.push("</ul>"); inUl = false; }
      if (inOl) { html.push("</ol>"); inOl = false; }
      html.push(`<h3>${h3[1]}</h3>`);
      continue;
    }
    if (h2) {
      if (inUl) { html.push("</ul>"); inUl = false; }
      if (inOl) { html.push("</ol>"); inOl = false; }
      html.push(`<h2>${h2[1]}</h2>`);
      continue;
    }

    const ul = processed.match(/^[-*] (.+)$/);
    if (ul) {
      if (inOl) { html.push("</ol>"); inOl = false; }
      if (!inUl) { html.push("<ul>"); inUl = true; }
      html.push(`<li>${ul[1]}</li>`);
      continue;
    }

    const ol = processed.match(/^\d+\. (.+)$/);
    if (ol) {
      if (inUl) { html.push("</ul>"); inUl = false; }
      if (!inOl) { html.push("<ol>"); inOl = true; }
      html.push(`<li>${ol[1]}</li>`);
      continue;
    }

    if (inUl) { html.push("</ul>"); inUl = false; }
    if (inOl) { html.push("</ol>"); inOl = false; }

    if (processed.trim() === "") {
      html.push("<br/>");
      continue;
    }

    html.push(`<p>${processed}</p>`);
  }

  if (inUl) html.push("</ul>");
  if (inOl) html.push("</ol>");

  return html.join("\n");
}
