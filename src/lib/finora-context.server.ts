// Server-only helper: loads a user's full financial context for the coach.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export async function loadFinanceContext(supabase: SupabaseClient<Database>, userId: string) {
  const [profileRes, billsRes, debtsRes, txRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("bills").select("title, amount, due_day, category").eq("user_id", userId),
    supabase.from("debts").select("title, balance, monthly_payment, interest_rate").eq("user_id", userId),
    supabase
      .from("transactions")
      .select("amount, kind, category, description, occurred_at")
      .eq("user_id", userId)
      .order("occurred_at", { ascending: false })
      .limit(30),
  ]);

  const profile = profileRes.data;
  return {
    name: profile?.name ?? null,
    monthly_income: profile?.monthly_income == null ? null : Number(profile.monthly_income),
    current_savings: profile?.current_savings == null ? null : Number(profile.current_savings),
    primary_goal: profile?.primary_goal ?? null,
    goal_target_amount:
      profile?.goal_target_amount == null ? null : Number(profile.goal_target_amount),
    goal_current_amount:
      profile?.goal_current_amount == null ? null : Number(profile.goal_current_amount),
    top_spending_categories: profile?.top_spending_categories ?? [],
    current_streak: profile?.current_streak ?? 0,
    longest_streak: profile?.longest_streak ?? 0,
    bills: (billsRes.data ?? []).map((b) => ({ ...b, amount: Number(b.amount) })),
    debts: (debtsRes.data ?? []).map((d) => ({
      ...d,
      balance: Number(d.balance),
      monthly_payment: d.monthly_payment == null ? null : Number(d.monthly_payment),
      interest_rate: d.interest_rate == null ? null : Number(d.interest_rate),
    })),
    transactions: (txRes.data ?? []).map((t) => ({ ...t, amount: Number(t.amount) })),
  };
}
