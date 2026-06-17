import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMyProfile, touchStreak, getStreak } from "@/lib/profile.functions";
import {
  getFinanceSnapshot,
  addBill,
  addDebt,
  addTransaction,
  deleteBill,
  deleteDebt,
  deleteTransaction,
} from "@/lib/finance.functions";
import { getOrGenerateDailyPriority, regenerateDailyPriority } from "@/lib/daily-priority.functions";
import { AppShell } from "@/components/finora/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Loader2,
  Plus,
  Trash2,
  MessageCircle,
  RefreshCcw,
  Sparkles,
  Wallet,
  Target,
  Receipt,
  CircleDollarSign,
  ArrowUpRight,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({ meta: [{ title: "Today — Finora" }] }),
  component: Dashboard,
});

const kes = (n: number | string | null | undefined) => {
  const v = n == null ? 0 : Number(n);
  return `KES ${v.toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;
};

const todayISO = () => new Date().toISOString().slice(0, 10);

function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const fetchProfile = useServerFn(getMyProfile);
  const fetchStreak = useServerFn(getStreak);
  const fetchSnapshot = useServerFn(getFinanceSnapshot);
  const fetchPriority = useServerFn(getOrGenerateDailyPriority);
  const regenPriority = useServerFn(regenerateDailyPriority);
  const touch = useServerFn(touchStreak);
  const removeBill = useServerFn(deleteBill);
  const removeDebt = useServerFn(deleteDebt);
  const removeTx = useServerFn(deleteTransaction);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? null));
  }, []);

  const profileQuery = useQuery({ queryKey: ["my-profile"], queryFn: () => fetchProfile() });
  const streakQuery = useQuery({ queryKey: ["streak"], queryFn: () => fetchStreak() });
  const snapshotQuery = useQuery({ queryKey: ["snapshot"], queryFn: () => fetchSnapshot() });

  // Touch streak once on mount
  useEffect(() => {
    touch()
      .then(() => queryClient.invalidateQueries({ queryKey: ["streak"] }))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redirect to onboarding if not done
  useEffect(() => {
    if (profileQuery.data?.profile && !profileQuery.data.profile.onboarded) {
      navigate({ to: "/onboarding", replace: true });
    }
  }, [profileQuery.data, navigate]);

  const priorityQuery = useQuery({
    queryKey: ["daily-priority"],
    queryFn: () => fetchPriority(),
    enabled: profileQuery.data?.profile?.onboarded === true,
  });

  const regenMutation = useMutation({
    mutationFn: async () => regenPriority(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["daily-priority"] }),
  });

  if (profileQuery.isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-paper">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const profile = profileQuery.data?.profile;
  if (!profile) return null;

  const snapshot = snapshotQuery.data;
  const bills = snapshot?.bills ?? [];
  const debts = snapshot?.debts ?? [];
  const transactions = snapshot?.transactions ?? [];
  const goals = snapshot?.goals ?? [];

  const totalDebt = debts.reduce((s, d) => s + Number(d.remaining_kes), 0);
  const totalBillsThisMonth = bills.reduce((s, b) => s + Number(b.amount_kes), 0);
  const topGoal = goals[0];
  const goalProgress =
    topGoal && topGoal.target_amount_kes > 0
      ? Math.min(
          100,
          Math.round((Number(topGoal.saved_so_far_kes) / Number(topGoal.target_amount_kes)) * 100),
        )
      : null;

  const firstName = (profile.full_name || "friend").trim().split(/\s+/)[0];
  const currentStreak = streakQuery.data?.current_streak ?? 0;

  return (
    <AppShell user={{ email: userEmail, name: profile.full_name }} streak={currentStreak}>
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-8">
          <p className="text-sm text-muted-foreground">{greeting()}, {firstName}.</p>
          <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Today's priority
          </h1>
        </div>

        {/* Daily Priority Card */}
        <section className="relative overflow-hidden rounded-3xl bg-primary p-7 text-primary-foreground shadow-xl sm:p-10">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-accent/30 blur-3xl" />
          <div className="absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-accent/10 blur-3xl" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 px-3 py-1 text-xs font-medium">
              <Sparkles className="h-3.5 w-3.5" /> One move today
            </div>
            {priorityQuery.isLoading || regenMutation.isPending ? (
              <div className="mt-6 flex items-center gap-3 text-primary-foreground/80">
                <Loader2 className="h-5 w-5 animate-spin" />
                Thinking through your week...
              </div>
            ) : priorityQuery.data?.priority ? (
              <>
                <p className="mt-5 font-display text-2xl font-medium leading-snug text-balance sm:text-3xl">
                  {priorityQuery.data.priority.recommendation}
                </p>
                {priorityQuery.data.priority.reasoning && (
                  <p className="mt-4 text-primary-foreground/85 text-pretty">
                    {priorityQuery.data.priority.reasoning}
                  </p>
                )}
                {priorityQuery.data.priority.goal_connection && (
                  <p className="mt-3 text-sm text-accent">
                    {priorityQuery.data.priority.goal_connection}
                  </p>
                )}
                {priorityQuery.data.priority.encouragement && (
                  <p className="mt-5 inline-block rounded-full bg-primary-foreground/10 px-3 py-1.5 text-sm font-medium">
                    {priorityQuery.data.priority.encouragement}
                  </p>
                )}
                <div className="mt-7 flex flex-wrap gap-3">
                  <Link to="/chat">
                    <Button size="lg" variant="secondary" className="rounded-full">
                      <MessageCircle className="h-4 w-4" /> Talk it through
                    </Button>
                  </Link>
                  <Button
                    size="lg"
                    variant="ghost"
                    className="rounded-full text-primary-foreground hover:bg-primary-foreground/10"
                    onClick={() => regenMutation.mutate()}
                    disabled={regenMutation.isPending}
                  >
                    <RefreshCcw className="h-4 w-4" /> Regenerate
                  </Button>
                </div>
              </>
            ) : (
              <p className="mt-6 text-primary-foreground/80">Loading your priority...</p>
            )}
          </div>
        </section>

        {/* Snapshot tiles */}
        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Tile
            icon={<Wallet className="h-4 w-4" />}
            label="Monthly income"
            value={kes(profile.monthly_income_kes)}
          />
          <Tile
            icon={<CircleDollarSign className="h-4 w-4" />}
            label="Savings"
            value={kes(profile.current_savings_kes)}
          />
          <Tile
            icon={<Receipt className="h-4 w-4" />}
            label="Bills"
            value={kes(totalBillsThisMonth)}
            sub={`${bills.length} bill${bills.length === 1 ? "" : "s"}`}
          />
          <Tile
            icon={<Target className="h-4 w-4" />}
            label="Total debt"
            value={kes(totalDebt)}
            sub={`${debts.length} active`}
          />
        </section>

        {/* Goal progress */}
        {(topGoal || profile.primary_goal) && (
          <section id="goal" className="mt-8 scroll-mt-24 rounded-2xl border border-border bg-card p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Your goal
                </p>
                <h3 className="mt-1 font-display text-xl font-semibold">
                  {topGoal?.name ?? profile.primary_goal}
                </h3>
                {topGoal ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {kes(topGoal.saved_so_far_kes)} of {kes(topGoal.target_amount_kes)}
                    {topGoal.target_date ? ` · by ${topGoal.target_date}` : ""}
                  </p>
                ) : null}
              </div>
              {goalProgress !== null && (
                <div className="text-3xl font-display font-semibold text-primary">
                  {goalProgress}%
                </div>
              )}
            </div>
            {goalProgress !== null && (
              <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${goalProgress}%` }}
                />
              </div>
            )}
          </section>
        )}

        {/* Money basics */}
        <section className="mt-8 grid gap-6 lg:grid-cols-2 scroll-mt-24" id="bills">
          <ListCard
            title="Bills"
            empty="No bills yet. Add the ones you pay every month."
            addLabel="Add bill"
            addForm={<AddBillForm />}
            items={bills.map((b) => ({
              id: b.id,
              primary: b.name,
              secondary: `${b.frequency} · due ${b.due_date}${b.is_paid ? " · paid" : ""}`,
              right: kes(b.amount_kes),
              onDelete: async () => {
                await removeBill({ data: { id: b.id } });
                queryClient.invalidateQueries({ queryKey: ["snapshot"] });
              },
            }))}
          />
          <div id="debts" className="scroll-mt-24"><ListCard
            title="Debts"
            empty="No debts logged. If you have any, add them so we can plan a way out together."
            addLabel="Add debt"
            addForm={<AddDebtForm />}
            items={debts.map((d) => ({
              id: d.id,
              primary: d.name,
              secondary: `${d.monthly_payment_kes ? `${kes(d.monthly_payment_kes)}/mo` : "No payment set"}${d.interest_rate ? ` · ${d.interest_rate}%` : ""}`,
              right: kes(d.remaining_kes),
              onDelete: async () => {
                await removeDebt({ data: { id: d.id } });
                queryClient.invalidateQueries({ queryKey: ["snapshot"] });
              },
            }))}
          /></div>
        </section>

        {/* Recent transactions */}
        <section className="mt-8">
          <div className="mb-3 flex items-end justify-between">
            <div>
              <h2 className="font-display text-2xl font-semibold">Recent activity</h2>
              <p className="text-sm text-muted-foreground">
                Log spending or income to keep your coach sharp.
              </p>
            </div>
            <AddTransactionDialog />
          </div>
          <div className="rounded-2xl border border-border bg-card">
            {transactions.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Nothing logged yet. Even one entry helps me give better priorities.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {transactions.map((t) => (
                  <li key={t.id} className="flex items-center gap-3 p-4">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-full ${
                        t.type === "income"
                          ? "bg-success/15 text-success"
                          : "bg-warning/15 text-warning-foreground"
                      }`}
                    >
                      <ArrowUpRight className={`h-4 w-4 ${t.type === "expense" ? "rotate-180" : ""}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium">
                        {t.note || t.category || (t.type === "income" ? "Income" : "Expense")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t.transaction_date} · {t.type}
                        {t.category && t.note ? ` · ${t.category}` : ""}
                      </p>
                    </div>
                    <div
                      className={`text-sm font-semibold ${
                        t.type === "expense" ? "text-foreground" : "text-success"
                      }`}
                    >
                      {t.type === "expense" ? "-" : "+"}
                      {kes(t.amount_kes)}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={async () => {
                        await removeTx({ data: { id: t.id } });
                        queryClient.invalidateQueries({ queryKey: ["snapshot"] });
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Habari ya asubuhi";
  if (h < 17) return "Habari ya mchana";
  return "Habari ya jioni";
}

function Tile({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <span className="text-primary">{icon}</span>
        {label}
      </div>
      <p className="mt-3 font-display text-2xl font-semibold tabular-nums">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function ListCard({
  title,
  empty,
  items,
  addLabel,
  addForm,
}: {
  title: string;
  empty: string;
  items: {
    id: string;
    primary: string;
    secondary: string;
    right: string;
    onDelete: () => Promise<void>;
  }[];
  addLabel: string;
  addForm: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h3 className="font-display text-lg font-semibold">{title}</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="ghost" className="rounded-full">
              <Plus className="h-4 w-4" /> {addLabel}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{addLabel}</DialogTitle>
            </DialogHeader>
            <div onClick={() => setOpen(false)}>{addForm}</div>
          </DialogContent>
        </Dialog>
      </div>
      {items.length === 0 ? (
        <p className="p-6 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 px-5 py-3.5">
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium">{item.primary}</p>
                <p className="text-xs text-muted-foreground">{item.secondary}</p>
              </div>
              <div className="text-sm font-semibold tabular-nums">{item.right}</div>
              <Button variant="ghost" size="icon-sm" onClick={() => item.onDelete()}>
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AddBillForm() {
  const queryClient = useQueryClient();
  const create = useServerFn(addBill);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState(todayISO());
  const [frequency, setFrequency] = useState<"once" | "weekly" | "monthly">("monthly");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !amount) return;
    setBusy(true);
    try {
      await create({
        data: {
          name: name.trim(),
          amount_kes: Number(amount),
          due_date: dueDate,
          frequency,
        },
      });
      queryClient.invalidateQueries({ queryKey: ["snapshot"] });
      toast.success("Bill added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't add");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="space-y-1.5">
        <Label>Name</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Electricity"
          autoFocus
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Amount (KES)</Label>
          <Input
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
            placeholder="2500"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Due date</Label>
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Frequency</Label>
        <Select value={frequency} onValueChange={(v) => setFrequency(v as typeof frequency)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="once">One-off</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={busy}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Add bill
        </Button>
      </DialogFooter>
    </form>
  );
}

function AddDebtForm() {
  const queryClient = useQueryClient();
  const create = useServerFn(addDebt);
  const [name, setName] = useState("");
  const [total, setTotal] = useState("");
  const [remaining, setRemaining] = useState("");
  const [payment, setPayment] = useState("");
  const [rate, setRate] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !total) return;
    setBusy(true);
    try {
      await create({
        data: {
          name: name.trim(),
          total_amount_kes: Number(total),
          remaining_kes: Number(remaining || total),
          monthly_payment_kes: payment ? Number(payment) : null,
          interest_rate: rate ? Number(rate) : null,
        },
      });
      queryClient.invalidateQueries({ queryKey: ["snapshot"] });
      toast.success("Debt logged");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't add");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="space-y-1.5">
        <Label>Name</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="M-Shwari loan"
          autoFocus
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Total (KES)</Label>
          <Input
            inputMode="numeric"
            value={total}
            onChange={(e) => setTotal(e.target.value.replace(/[^\d]/g, ""))}
            placeholder="20000"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Remaining (KES)</Label>
          <Input
            inputMode="numeric"
            value={remaining}
            onChange={(e) => setRemaining(e.target.value.replace(/[^\d]/g, ""))}
            placeholder="15000"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Monthly payment</Label>
          <Input
            inputMode="numeric"
            value={payment}
            onChange={(e) => setPayment(e.target.value.replace(/[^\d]/g, ""))}
            placeholder="3000"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Interest %</Label>
          <Input
            inputMode="decimal"
            value={rate}
            onChange={(e) => setRate(e.target.value.replace(/[^\d.]/g, ""))}
            placeholder="9"
          />
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={busy}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Add debt
        </Button>
      </DialogFooter>
    </form>
  );
}

function AddTransactionDialog() {
  const queryClient = useQueryClient();
  const create = useServerFn(addTransaction);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"expense" | "income">("expense");
  const [category, setCategory] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount) return;
    setBusy(true);
    try {
      await create({
        data: {
          amount_kes: Number(amount),
          type,
          category: category.trim() || null,
          note: note.trim() || null,
        },
      });
      queryClient.invalidateQueries({ queryKey: ["snapshot"] });
      toast.success("Logged");
      setOpen(false);
      setAmount("");
      setCategory("");
      setNote("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't add");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="rounded-full">
          <Plus className="h-4 w-4" /> Log activity
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log activity</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Amount (KES)</Label>
              <Input
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
                placeholder="500"
                autoFocus
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Transport"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Note</Label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Matatu home"
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
