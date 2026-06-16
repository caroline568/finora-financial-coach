// Server-only helper: loads a user's full financial context for the coach.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export async function loadFinanceContext(supabase: SupabaseClient<Database>, userId: string) {
  const [profileRes, billsRes, debtsRes, txRes, goalsRes, streakRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase
      .from("bills")
      .select("name, amount_kes, frequency, due_date, is_paid")
      .eq("user_id", userId),
    supabase
      .from("debts")
      .select("name, total_amount_kes, remaining_kes, monthly_payment_kes, interest_rate")
      .eq("user_id", userId),
    supabase
      .from("transactions")
      .select("amount_kes, type, category, note, transaction_date")
      .eq("user_id", userId)
      .order("transaction_date", { ascending: false })
      .limit(30),
    supabase
      .from("goals")
      .select("name, target_amount_kes, saved_so_far_kes, target_date")
      .eq("user_id", userId)
      .order("created_at", { ascending: true }),
    supabase
      .from("streaks")
      .select("current_streak, longest_streak")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  const profile = profileRes.data;
  return {
    full_name: profile?.full_name ?? null,
    monthly_income_kes: profile?.monthly_income_kes ?? null,
    current_savings_kes: profile?.current_savings_kes ?? 0,
    active_debts_kes: profile?.active_debts_kes ?? 0,
    primary_goal: profile?.primary_goal ?? null,
    spending_categories: profile?.spending_categories ?? [],
    current_streak: streakRes.data?.current_streak ?? 0,
    longest_streak: streakRes.data?.longest_streak ?? 0,
    bills: billsRes.data ?? [],
    debts: debtsRes.data ?? [],
    transactions: txRes.data ?? [],
    goals: goalsRes.data ?? [],
  };
}

export type FinanceContext = Awaited<ReturnType<typeof loadFinanceContext>>;
