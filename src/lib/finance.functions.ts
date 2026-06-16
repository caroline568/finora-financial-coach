import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getFinanceSnapshot = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [bills, debts, txs, goals] = await Promise.all([
      context.supabase
        .from("bills")
        .select("*")
        .eq("user_id", context.userId)
        .order("due_date", { ascending: true }),
      context.supabase
        .from("debts")
        .select("*")
        .eq("user_id", context.userId)
        .order("remaining_kes", { ascending: false }),
      context.supabase
        .from("transactions")
        .select("*")
        .eq("user_id", context.userId)
        .order("transaction_date", { ascending: false })
        .limit(15),
      context.supabase
        .from("goals")
        .select("*")
        .eq("user_id", context.userId)
        .order("created_at", { ascending: true }),
    ]);
    if (bills.error) throw new Error(bills.error.message);
    if (debts.error) throw new Error(debts.error.message);
    if (txs.error) throw new Error(txs.error.message);
    if (goals.error) throw new Error(goals.error.message);
    return { bills: bills.data, debts: debts.data, transactions: txs.data, goals: goals.data };
  });

const BillInput = z.object({
  name: z.string().min(1).max(80),
  amount_kes: z.number().int().min(1).max(100_000_000),
  frequency: z.enum(["once", "weekly", "monthly"]).default("monthly"),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const addBill = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => BillInput.parse(i))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("bills")
      .insert({ ...data, user_id: context.userId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteBill = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("bills")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const toggleBillPaid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ id: z.string().uuid(), is_paid: z.boolean() }).parse(i),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("bills")
      .update({ is_paid: data.is_paid })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const DebtInput = z.object({
  name: z.string().min(1).max(80),
  total_amount_kes: z.number().int().min(1).max(1_000_000_000),
  remaining_kes: z.number().int().min(0).max(1_000_000_000),
  monthly_payment_kes: z.number().int().min(0).max(100_000_000).optional().nullable(),
  interest_rate: z.number().min(0).max(200).optional().nullable(),
});

export const addDebt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => DebtInput.parse(i))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("debts")
      .insert({ ...data, user_id: context.userId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteDebt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("debts")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const TxInput = z.object({
  amount_kes: z.number().int().min(1).max(100_000_000),
  type: z.enum(["expense", "income"]),
  category: z.string().max(40).optional().nullable(),
  note: z.string().max(200).optional().nullable(),
  transaction_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const addTransaction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => TxInput.parse(i))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("transactions")
      .insert({ ...data, user_id: context.userId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteTransaction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("transactions")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const GoalInput = z.object({
  name: z.string().min(1).max(120),
  target_amount_kes: z.number().int().min(1).max(1_000_000_000),
  saved_so_far_kes: z.number().int().min(0).max(1_000_000_000).optional(),
  target_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
});

export const addGoal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => GoalInput.parse(i))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("goals")
      .insert({ ...data, user_id: context.userId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateGoalProgress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({ id: z.string().uuid(), saved_so_far_kes: z.number().int().min(0) })
      .parse(i),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("goals")
      .update({ saved_so_far_kes: data.saved_so_far_kes })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteGoal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("goals")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
