import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Users, MessageSquare, TrendingUp, Coffee, ChevronDown, ChevronRight, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import finoraLogo from "@/assets/finora-logo.png";

const ADMIN_KEY_STORAGE = "finora_admin_key";

interface Stats {
  totalConversations: number;
  totalMessages: number;
  avgMessagesPerConversation: number;
  planBreakdown: Record<string, number>;
  activityLast7Days: { day: string; message_count: number }[];
}

interface ConvRow {
  id: number;
  title: string;
  plan: string;
  createdAt: string;
  messageCount: number;
}

interface ConvsPage {
  conversations: ConvRow[];
  total: number;
  page: number;
  pages: number;
}

interface Transcript {
  conversation: { id: number; title: string; plan: string; createdAt: string };
  messages: { id: number; role: string; content: string; createdAt: string }[];
}

async function apiFetch(path: string, key: string) {
  const res = await fetch(`/api/admin${path}`, {
    headers: { "x-admin-key": key },
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

export default function Admin() {
  const [, setLocation] = useLocation();
  const [key, setKey] = useState(() => localStorage.getItem(ADMIN_KEY_STORAGE) || "");
  const [keyInput, setKeyInput] = useState("");
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState(false);

  const [stats, setStats] = useState<Stats | null>(null);
  const [convs, setConvs] = useState<ConvsPage | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [transcripts, setTranscripts] = useState<Record<number, Transcript>>({});

  const load = useCallback(async (k: string, p: number) => {
    setLoading(true);
    try {
      const [s, c] = await Promise.all([
        apiFetch("/stats", k),
        apiFetch(`/conversations?page=${p}`, k),
      ]);
      setStats(s);
      setConvs(c);
      setAuthed(true);
      localStorage.setItem(ADMIN_KEY_STORAGE, k);
      setKey(k);
    } catch {
      setAuthError(true);
      setAuthed(false);
      localStorage.removeItem(ADMIN_KEY_STORAGE);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-login if key was stored
  useEffect(() => {
    if (key) load(key, 1);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(false);
    load(keyInput.trim(), 1);
  };

  const loadTranscript = async (id: number) => {
    if (transcripts[id]) { setExpandedId(expandedId === id ? null : id); return; }
    try {
      const data = await apiFetch(`/conversations/${id}/messages`, key);
      setTranscripts((prev) => ({ ...prev, [id]: data }));
      setExpandedId(id);
    } catch { /* ignore */ }
  };

  const changePage = (p: number) => { setPage(p); load(key, p); };

  // ── Login screen ──────────────────────────────────────────────
  if (!authed) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="flex items-center gap-3">
            <img src={finoraLogo} alt="Finora" className="w-8 h-8 object-contain" />
            <span className="font-display font-bold text-xl text-primary">Finora Admin</span>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="admin-key-input" className="block text-sm font-medium text-foreground mb-1.5">Admin key</label>
              <input
                id="admin-key-input"
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="Enter admin key"
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                autoFocus
              />
              {authError && (
                <p className="mt-1.5 text-sm text-destructive">Wrong key. Try again.</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={!keyInput.trim()}>
              Sign in
            </Button>
          </form>
          <p className="text-xs text-muted-foreground text-center">
            Set <code className="bg-muted px-1 rounded">ADMIN_KEY</code> env var to change the default key.
          </p>
        </div>
      </div>
    );
  }

  // ── Dashboard ─────────────────────────────────────────────────
  const freePct = stats
    ? Math.round(((stats.planBreakdown["FREE"] || 0) / Math.max(stats.totalConversations, 1)) * 100)
    : 0;

  const chartData = stats?.activityLast7Days.map((d) => ({
    day: new Date(d.day).toLocaleDateString("en-KE", { weekday: "short" }),
    messages: d.message_count,
  })) || [];

  return (
    <div className="min-h-[100dvh] bg-background">
      {/* Top bar */}
      <header className="border-b border-border/40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => setLocation("/")} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2.5">
            <img src={finoraLogo} alt="Finora" className="w-6 h-6 object-contain" />
            <span className="font-display font-semibold text-foreground">Admin Dashboard</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Buy Me a Coffee */}
          <a
            href="https://www.buymeacoffee.com/finora"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium bg-[#FFDD00] text-[#000000] px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
          >
            <Coffee className="w-4 h-4" />
            Support Finora
          </a>
          <Button variant="ghost" size="icon" onClick={() => load(key, page)} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { localStorage.removeItem(ADMIN_KEY_STORAGE); setAuthed(false); setKey(""); }}
            className="text-muted-foreground"
          >
            Sign out
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Stat cards */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Total conversations", value: stats.totalConversations, icon: <Users className="w-5 h-5" />, color: "text-primary" },
              { label: "Total messages", value: stats.totalMessages, icon: <MessageSquare className="w-5 h-5" />, color: "text-primary" },
              { label: "Avg messages / chat", value: stats.avgMessagesPerConversation, icon: <TrendingUp className="w-5 h-5" />, color: "text-primary" },
              { label: "PRO users", value: `${100 - freePct}%`, icon: <Coffee className="w-5 h-5" />, color: "text-accent" },
            ].map((card) => (
              <div key={card.label} className="bg-card border border-border/50 rounded-2xl p-5 space-y-2">
                <div className={`${card.color}`}>{card.icon}</div>
                <div className="text-2xl font-display font-bold text-foreground">{card.value}</div>
                <div className="text-xs text-muted-foreground">{card.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Activity chart + plan split */}
        {stats && (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Chart */}
            <div className="lg:col-span-2 bg-card border border-border/50 rounded-2xl p-6">
              <h2 className="font-semibold text-foreground mb-4">Messages — last 7 days</h2>
              {chartData.length === 0 ? (
                <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">No activity yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={chartData} barSize={28}>
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#888" }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#888" }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 12, fontSize: 13 }}
                      cursor={{ fill: "var(--color-primary)", opacity: 0.06 }}
                    />
                    <Bar dataKey="messages" radius={[6, 6, 0, 0]}>
                      {chartData.map((_, i) => (
                        <Cell key={i} fill="hsl(160 70% 22%)" />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Plan split */}
            <div className="bg-card border border-border/50 rounded-2xl p-6 flex flex-col gap-4">
              <h2 className="font-semibold text-foreground">Plan breakdown</h2>
              <div className="flex-1 space-y-4">
                {(["FREE", "PRO"] as const).map((plan) => {
                  const n = stats.planBreakdown[plan] || 0;
                  const pct = Math.round((n / Math.max(stats.totalConversations, 1)) * 100);
                  return (
                    <div key={plan} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-foreground">{plan}</span>
                        <span className="text-muted-foreground">{n} ({pct}%)</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${plan === "PRO" ? "bg-accent" : "bg-primary"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Conversations table */}
        <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border/40 flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Recent conversations</h2>
            <span className="text-sm text-muted-foreground">{convs?.total ?? 0} total</span>
          </div>

          {convs && convs.conversations.length === 0 ? (
            <div className="px-6 py-12 text-center text-muted-foreground text-sm">No conversations yet.</div>
          ) : (
            <div className="divide-y divide-border/40">
              {convs?.conversations.map((conv) => (
                <div key={conv.id}>
                  <button
                    onClick={() => loadTranscript(conv.id)}
                    className="w-full flex items-center gap-4 px-6 py-4 hover:bg-muted/30 transition-colors text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{conv.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(conv.createdAt).toLocaleString("en-KE", {
                          dateStyle: "medium", timeStyle: "short",
                        })}
                      </p>
                    </div>
                    <Badge variant={conv.plan === "PRO" ? "accent" : "secondary"} className="shrink-0">
                      {conv.plan}
                    </Badge>
                    <span className="text-sm text-muted-foreground shrink-0">
                      {conv.messageCount} msg{conv.messageCount !== 1 ? "s" : ""}
                    </span>
                    {expandedId === conv.id ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    )}
                  </button>

                  {expandedId === conv.id && transcripts[conv.id] && (
                    <div className="bg-muted/20 px-6 pb-6 space-y-3">
                      <div className="pt-4 space-y-3 max-h-80 overflow-y-auto">
                        {transcripts[conv.id].messages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                                msg.role === "user"
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-card border border-border/60 text-foreground"
                              }`}
                            >
                              <p className="text-[11px] font-semibold mb-1 opacity-60 uppercase tracking-wide">
                                {msg.role}
                              </p>
                              <p className="whitespace-pre-wrap">{msg.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {convs && convs.pages > 1 && (
            <div className="px-6 py-4 border-t border-border/40 flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                disabled={page === 1}
                onClick={() => changePage(page - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {convs.pages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={page === convs.pages}
                onClick={() => changePage(page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </div>

        {/* Buy Me a Coffee section */}
        <div className="bg-gradient-to-br from-[#fff9e6] to-[#fff3cc] border border-[#FFDD00]/40 rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-6">
          <div className="flex-1 space-y-1">
            <h3 className="font-display font-bold text-gray-900">Keep Finora running</h3>
            <p className="text-sm text-gray-600">
              If Finora is helping people take control of their money, consider buying us a coffee.
              Every contribution helps keep the AI running.
            </p>
          </div>
          <a
            href="https://www.buymeacoffee.com/finora"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 bg-[#FFDD00] text-gray-900 font-bold px-6 py-3 rounded-xl hover:opacity-90 transition-opacity shrink-0 text-sm"
          >
            <Coffee className="w-5 h-5" />
            Buy Finora a coffee
          </a>
        </div>
      </main>
    </div>
  );
}
