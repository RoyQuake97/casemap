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
  const printRef = useRef<HTMLDivElement>(null);

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

  // Only redirect to paywall on page load if no free questions AND no result showing
  // This lets users read their answer before being redirected
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
      // Don't invalidate profile immediately — let user read the answer first
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
    // If user already used free question, redirect to paywall on next attempt
    if (profile && profile.subscriptionStatus !== "active" && profile.freeQuestionsRemaining <= 0) {
      navigate("/paywall");
      return;
    }
    setResult(null);
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
      <div style="border:1px solid #ddd; border-radius:6px; padding:12px; margin-bottom:8px;">
        <p style="font-weight:600; font-size:12px; margin:0 0 4px 0;">${esc(s.citationLabel)}</p>
        ${s.category ? `<span style="font-size:10px; background:#f0f0f0; padding:2px 6px; border-radius:3px;">${esc(s.category)}</span>` : ""}
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
          .header { border-bottom: 2px solid #4a3728; padding-bottom: 16px; margin-bottom: 24px; }
          .header h1 { font-size: 24px; color: #4a3728; margin: 0; }
          .header p { font-size: 12px; color: #888; margin: 4px 0 0 0; }
          .question { background: #f9f7f4; border-left: 3px solid #4a3728; padding: 12px 16px; margin-bottom: 24px; font-style: italic; }
          .answer { line-height: 1.8; font-size: 14px; }
          .answer h2, .answer h3 { color: #4a3728; }
          .answer strong { color: #333; }
          .answer ul, .answer ol { margin: 8px 0; padding-left: 24px; }
          .answer li { margin-bottom: 4px; }
          .sources-title { font-size: 16px; color: #4a3728; border-top: 1px solid #ddd; padding-top: 20px; margin-top: 30px; }
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
              aria-label="Legal question"
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
                  aria-label="Response language"
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
                <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" role="status" aria-label="Loading" />
                <p className="text-sm text-muted-foreground">Searching Lebanese legal database...</p>
              </div>
            </div>
          )}

          {result && !askMutation.isPending && (
            <div className="flex-1 overflow-auto" ref={printRef}>
              <div className="bg-card border border-border rounded-md p-6 answer-content">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-serif text-lg font-semibold text-foreground">Analysis</h2>
                  <button
                    onClick={handleExportPDF}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground border border-border rounded-md hover:bg-muted transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                    Export PDF
                  </button>
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

    // Headings
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

    // Unordered list
    const ul = processed.match(/^[-*] (.+)$/);
    if (ul) {
      if (inOl) { html.push("</ol>"); inOl = false; }
      if (!inUl) { html.push("<ul>"); inUl = true; }
      html.push(`<li>${ul[1]}</li>`);
      continue;
    }

    // Ordered list
    const ol = processed.match(/^\d+\. (.+)$/);
    if (ol) {
      if (inUl) { html.push("</ul>"); inUl = false; }
      if (!inOl) { html.push("<ol>"); inOl = true; }
      html.push(`<li>${ol[1]}</li>`);
      continue;
    }

    // Close open lists on non-list lines
    if (inUl) { html.push("</ul>"); inUl = false; }
    if (inOl) { html.push("</ol>"); inOl = false; }

    // Empty line = paragraph break
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
