import { useLocation } from "wouter";
import { Plus, TrendingUp, TrendingDown, ChevronRight, Flame, Target, Zap } from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";
import { useCurrentUser, useGoals, useDashboardSummary, useTransactions, formatKES, getStoredUserId } from "@/hooks/useUser";
import finoraLogo from "@/assets/finora-logo.png";
import { useEffect } from "react";

const GREEN = "#22c55e";

/* ── Health score ring ─────────────────────────────────────────── */
function HealthRing({ score }: { score: number }) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  const color = score >= 70 ? GREEN : score >= 40 ? "#f59e0b" : "#ef4444";
  const label = score >= 70 ? "Great" : score >= 50 ? "Good" : score >= 30 ? "Fair" : "Needs work";

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-36 h-36">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={r} fill="none" stroke="#f3f4f6" strokeWidth="10" />
          <circle
            cx="60" cy="60" r={r} fill="none"
            stroke={color} strokeWidth="10"
            strokeDasharray={`${filled} ${circ - filled}`}
            strokeLinecap="round"
            style={{ transition: "stroke-dasharray 0.8s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-extrabold text-gray-900">{score}</span>
          <span className="text-xs font-semibold text-gray-400">/100</span>
        </div>
      </div>
      <span className="text-sm font-bold mt-1" style={{ color }}>{label}</span>
      <span className="text-xs text-gray-400">Financial Health Score</span>
    </div>
  );
}

/* ── Category colors ────────────────────────────────────────────── */
const CAT_COLORS: Record<string, string> = {
  food: "#f97316", transport: "#3b82f6", rent: "#8b5cf6",
  utilities: "#06b6d4", airtime: "#ec4899", entertainment: "#f59e0b",
  health: "#10b981", education: "#6366f1", savings: GREEN, other: "#9ca3af",
};
const CAT_LABELS: Record<string, string> = {
  food: "Food", transport: "Transport", rent: "Rent", utilities: "Utilities",
  airtime: "Airtime", entertainment: "Fun", health: "Health",
  education: "Education", savings: "Savings", "debt-repayment": "Debt",
  business: "Business", family: "Family", other: "Other",
};

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const userId = getStoredUserId();
  const { data: user, isLoading: loadingUser } = useCurrentUser();
  const { data: goals = [] } = useGoals();
  const { data: summary } = useDashboardSummary();
  const { data: transactions = [] } = useTransactions(8);

  useEffect(() => {
    if (!userId) setLocation("/signup");
  }, [userId, setLocation]);

  if (!userId || loadingUser) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-8 h-8 rounded-full border-4 border-green-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  const firstName = user?.name?.split(" ")[0] ?? "there";
  const activeGoals = goals.filter(g => g.status === "active").slice(0, 3);
  const recentTxns = transactions.slice(0, 5);
  const savingsStreak = summary?.streaks?.find(s => s.habitType === "savings")?.currentStreak ?? 0;
  const trackingStreak = summary?.streaks?.find(s => s.habitType === "daily-tracking")?.currentStreak ?? 0;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div style={{ backgroundColor: GREEN }} className="px-5 pt-14 pb-8 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white" />
          <div className="absolute top-4 right-16 w-20 h-20 rounded-full bg-white" />
        </div>
        <div className="relative z-10 flex items-center justify-between mb-4">
          <div>
            <p className="text-white/80 text-sm font-medium">{greeting},</p>
            <h1 className="text-white text-2xl font-extrabold">{firstName} 👋</h1>
          </div>
          <button onClick={() => setLocation("/profile")} className="flex items-center gap-1.5">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <span className="text-white font-bold text-sm">{(user?.name ?? "?")[0].toUpperCase()}</span>
            </div>
          </button>
        </div>

        {/* Health score + month summary inline */}
        <div className="bg-white/15 backdrop-blur rounded-2xl p-4 flex items-center gap-6">
          <HealthRing score={user?.healthScore ?? 50} />
          <div className="flex-1 space-y-2">
            <StatRow icon={TrendingUp} label="Income" value={formatKES(summary?.monthlyIncome ?? 0)} positive />
            <StatRow icon={TrendingDown} label="Spent" value={formatKES(summary?.monthlyExpenses ?? 0)} />
            <div className="h-px bg-white/20" />
            <div className="flex items-center justify-between">
              <span className="text-white/70 text-xs font-medium">Net</span>
              <span className={`text-sm font-extrabold ${(summary?.net ?? 0) >= 0 ? "text-green-200" : "text-red-300"}`}>
                {(summary?.net ?? 0) >= 0 ? "+" : ""}{formatKES(summary?.net ?? 0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pt-5 space-y-5">
        {/* Streaks */}
        {(savingsStreak > 0 || trackingStreak > 0) && (
          <div className="flex gap-3">
            {savingsStreak > 0 && (
              <StreakCard icon={Flame} label="Savings streak" value={`${savingsStreak} days`} color="#f97316" />
            )}
            {trackingStreak > 0 && (
              <StreakCard icon={Zap} label="Tracking streak" value={`${trackingStreak} days`} color="#6366f1" />
            )}
          </div>
        )}

        {/* Spending breakdown */}
        {summary && Object.keys(summary.expensesByCategory).length > 0 && (
          <Section title="Spending this month">
            <div className="space-y-2">
              {Object.entries(summary.expensesByCategory)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([cat, amt]) => {
                  const pct = summary.monthlyExpenses > 0 ? Math.round((amt / summary.monthlyExpenses) * 100) : 0;
                  return (
                    <div key={cat}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-gray-700">{CAT_LABELS[cat] ?? cat}</span>
                        <span className="text-xs text-gray-400">{formatKES(amt)} · {pct}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div style={{ width: `${pct}%`, backgroundColor: CAT_COLORS[cat] ?? "#9ca3af" }}
                          className="h-full rounded-full transition-all duration-500" />
                      </div>
                    </div>
                  );
                })}
            </div>
          </Section>
        )}

        {/* Goals */}
        <Section title="Active goals" action="See all" onAction={() => setLocation("/goals")}>
          {activeGoals.length === 0 ? (
            <EmptyCard
              icon={Target}
              message="No goals yet. Set one and start making progress!"
              cta="Add a goal"
              onCta={() => setLocation("/goals")}
            />
          ) : (
            <div className="space-y-3">
              {activeGoals.map(g => {
                const pct = Math.min(100, Math.round(((g.currentAmount ?? 0) / g.targetAmount) * 100));
                return (
                  <button
                    key={g.id}
                    onClick={() => setLocation("/goals")}
                    className="w-full bg-white rounded-xl p-4 text-left shadow-sm border border-gray-50 active:scale-[0.99] transition-transform"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{g.emoji ?? "🎯"}</span>
                        <span className="font-bold text-gray-900 text-sm">{g.title}</span>
                      </div>
                      <span className="text-xs font-bold" style={{ color: GREEN }}>{pct}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div style={{ width: `${pct}%`, backgroundColor: GREEN }}
                        className="h-full rounded-full transition-all duration-500" />
                    </div>
                    <div className="flex justify-between mt-1.5">
                      <span className="text-xs text-gray-400">{formatKES(g.currentAmount ?? 0)} saved</span>
                      <span className="text-xs text-gray-400">Goal: {formatKES(g.targetAmount)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </Section>

        {/* Recent transactions */}
        <Section title="Recent activity" action="See all" onAction={() => setLocation("/tracker")}>
          {recentTxns.length === 0 ? (
            <EmptyCard
              icon={TrendingUp}
              message="Start tracking your pesa — log your first transaction."
              cta="Add transaction"
              onCta={() => setLocation("/tracker")}
            />
          ) : (
            <div className="space-y-2">
              {recentTxns.map(t => (
                <div key={t.id} className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-50">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-base"
                    style={{ backgroundColor: `${CAT_COLORS[t.category] ?? "#9ca3af"}20` }}>
                    {getCatEmoji(t.category)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{CAT_LABELS[t.category] ?? t.category}</p>
                    <p className="text-xs text-gray-400 truncate">{t.description || formatDate(t.date)}</p>
                  </div>
                  <span className={`text-sm font-extrabold ${t.type === "income" ? "" : "text-gray-700"}`}
                    style={t.type === "income" ? { color: GREEN } : {}}>
                    {t.type === "income" ? "+" : "-"}{formatKES(t.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>

      {/* FAB */}
      <button
        onClick={() => setLocation("/tracker")}
        style={{ backgroundColor: GREEN }}
        className="fixed right-4 bottom-24 w-14 h-14 rounded-full shadow-xl shadow-green-500/30 flex items-center justify-center active:scale-95 transition-transform z-40"
        aria-label="Add transaction"
      >
        <Plus className="w-7 h-7 text-white" />
      </button>

      <BottomNav />
    </div>
  );
}

/* ── utility sub-components ──────────────────────────────────────── */
function StatRow({ icon: Icon, label, value, positive = false }: { icon: React.ElementType; label: string; value: string; positive?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="w-4 h-4 text-white/60 shrink-0" />
      <span className="text-white/70 text-xs font-medium flex-1">{label}</span>
      <span className="text-white text-sm font-extrabold">{value}</span>
    </div>
  );
}

function StreakCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string; color: string }) {
  return (
    <div className="flex-1 bg-white rounded-xl p-3 shadow-sm border border-gray-50 flex items-center gap-2">
      <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-extrabold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

function Section({ title, action, onAction, children }: { title: string; action?: string; onAction?: () => void; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-extrabold text-gray-900">{title}</h2>
        {action && onAction && (
          <button onClick={onAction} className="text-xs font-semibold flex items-center gap-0.5" style={{ color: GREEN }}>
            {action} <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function EmptyCard({ icon: Icon, message, cta, onCta }: { icon: React.ElementType; message: string; cta: string; onCta: () => void }) {
  return (
    <div className="bg-white rounded-xl p-5 text-center shadow-sm border border-gray-50">
      <Icon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
      <p className="text-sm text-gray-400 mb-3">{message}</p>
      <button onClick={onCta} style={{ color: GREEN }} className="text-sm font-bold">{cta}</button>
    </div>
  );
}

function getCatEmoji(cat: string) {
  const map: Record<string, string> = {
    food: "🍽️", transport: "🚌", rent: "🏠", utilities: "💡",
    airtime: "📱", entertainment: "🎉", health: "💊", education: "📚",
    savings: "💰", salary: "💼", "side-hustle": "⚡", business: "🏪",
    mpesa: "📲", family: "👨‍👩‍👧", "debt-repayment": "🔄", other: "📦", "other-income": "💵",
  };
  return map[cat] ?? "📦";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-KE", { day: "numeric", month: "short" });
}
