import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getMyProfile, updateMyProfile } from "@/lib/profile.functions";
import { addGoal } from "@/lib/finance.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FinoraWordmark } from "@/components/finora/logo";
import { Loader2, ArrowRight, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Welcome — Finora" }] }),
  component: Onboarding,
});

const STEPS = ["income", "savings", "goal", "spending"] as const;

const CATEGORIES = [
  "Food & groceries",
  "Transport",
  "Rent",
  "Electricity",
  "Water",
  "Airtime / data",
  "School fees",
  "Family support",
  "Eating out",
  "Entertainment",
  "Loans",
  "M-Pesa fees",
];

function Onboarding() {
  const navigate = useNavigate();
  const fetchProfile = useServerFn(getMyProfile);
  const saveProfile = useServerFn(updateMyProfile);
  const createGoal = useServerFn(addGoal);
  const { data, isLoading } = useQuery({
    queryKey: ["my-profile"],
    queryFn: () => fetchProfile(),
  });

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [income, setIncome] = useState("");
  const [savings, setSavings] = useState("");
  const [goal, setGoal] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data?.profile) {
      setName(data.profile.full_name ?? "");
      setIncome(
        data.profile.monthly_income_kes ? String(data.profile.monthly_income_kes) : "",
      );
      setSavings(
        data.profile.current_savings_kes ? String(data.profile.current_savings_kes) : "",
      );
      setGoal(data.profile.primary_goal ?? "");
      setCategories(data.profile.spending_categories ?? []);
    }
  }, [data]);

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-paper">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  async function finish() {
    setSaving(true);
    try {
      const goalText = goal.trim() || "Build my first emergency fund";
      await saveProfile({
        data: {
          full_name: name.trim() || "friend",
          monthly_income_kes: Number(income) || 0,
          current_savings_kes: Number(savings) || 0,
          primary_goal: goalText,
          spending_categories: categories,
          onboarded: true,
        },
      });
      if (Number(goalTarget) > 0) {
        try {
          await createGoal({
            data: {
              name: goalText,
              target_amount_kes: Number(goalTarget),
              saved_so_far_kes: Number(savings) || 0,
            },
          });
        } catch {
          // non-blocking
        }
      }
      toast.success("Sawa — let's get to work.");
      navigate({ to: "/app", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save");
    } finally {
      setSaving(false);
    }
  }

  const current = STEPS[step];
  const totalSteps = STEPS.length;

  return (
    <div className="min-h-screen bg-paper">
      <div className="mx-auto flex h-20 w-full max-w-3xl items-center justify-between px-5 sm:px-8">
        <FinoraWordmark />
        <span className="text-xs text-muted-foreground">
          Step {step + 1} of {totalSteps}
        </span>
      </div>
      <div className="mx-auto max-w-xl px-5 pb-16 pt-4 sm:px-8">
        <div className="mb-6 h-1 w-full overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
          />
        </div>

        <div className="rounded-3xl border border-border bg-card p-7 shadow-sm">
          {current === "income" && (
            <div>
              <h1 className="font-display text-3xl font-semibold leading-tight">
                {data?.profile?.full_name ? `Karibu, ${data.profile.full_name.split(" ")[0]}.` : "Karibu."} Roughly, how much do you earn in a month?
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Salary, side hustles, casual — add it all up. An average is fine.
              </p>
              <div className="mt-6 space-y-1.5">
                <Label htmlFor="income">Monthly income (KES)</Label>
                <Input
                  id="income"
                  inputMode="numeric"
                  value={income}
                  onChange={(e) => setIncome(e.target.value.replace(/[^\d]/g, ""))}
                  placeholder="35000"
                  autoFocus
                />
              </div>
            </div>
          )}


          {current === "savings" && (
            <div>
              <h1 className="font-display text-3xl font-semibold leading-tight">
                And how much do you have set aside right now?
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                M-Pesa savings, bank, chama — whatever you can reach. Zero is totally fine,
                we'll start there.
              </p>
              <div className="mt-6 space-y-1.5">
                <Label htmlFor="savings">Current savings (KES)</Label>
                <Input
                  id="savings"
                  inputMode="numeric"
                  value={savings}
                  onChange={(e) => setSavings(e.target.value.replace(/[^\d]/g, ""))}
                  placeholder="0"
                  autoFocus
                />
              </div>
            </div>
          )}

          {current === "goal" && (
            <div>
              <h1 className="font-display text-3xl font-semibold leading-tight">
                What's the one money goal on your mind?
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                In your own words. We'll work toward it together.
              </p>
              <div className="mt-6 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="goal">My goal</Label>
                  <Input
                    id="goal"
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    placeholder="e.g. Clear my loan, save for school fees, stop borrowing from friends..."
                    autoFocus
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="target">Target amount (optional, KES)</Label>
                  <Input
                    id="target"
                    inputMode="numeric"
                    value={goalTarget}
                    onChange={(e) => setGoalTarget(e.target.value.replace(/[^\d]/g, ""))}
                    placeholder="90000"
                  />
                </div>
              </div>
            </div>
          )}

          {current === "spending" && (
            <div>
              <h1 className="font-display text-3xl font-semibold leading-tight">
                Where does most of your money go?
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Pick a few — no judgment, just so I know your real life.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {CATEGORIES.map((c) => {
                  const on = categories.includes(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() =>
                        setCategories((prev) =>
                          prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
                        )
                      }
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                        on
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-muted-foreground hover:border-primary/40",
                      )}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-8 flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="rounded-full"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            {step < totalSteps - 1 ? (
              <Button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                className="rounded-full"
                disabled={current === "income" && income.trim().length === 0}
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button type="button" onClick={finish} disabled={saving} className="rounded-full">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                I'm ready
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
