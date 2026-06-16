import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getFinanceSnapshot = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [bills, debts, txs] = await Promise.all([
      context.supabase
        .from("bills")
        .select("*")
        .eq("user_id", context.userId)
        .order("due_day", { ascending: true }),
      context.supabase
        .from("debts")
        .select("*")
        .eq("user_id", context.userId)
        .order("balance", { ascending: false }),
      context.supabase
        .from("transactions")
        .select("*")
        .eq("user_id", context.userId)
        .order("occurred_at", { ascending: false })
        .limit(15),
    ]);
    if (bills.error) throw new Error(bills.error.message);
    if (debts.error) throw new Error(debts.error.message);
    if (txs.error) throw new Error(txs.error.message);
    return { bills: bills.data, debts: debts.data, transactions: txs.data };
  });

const BillInput = z.object({
  title: z.string().min(1).max(80),
  amount: z.number().min(0).max(100_000_000),
  due_day: z.number().int().min(1).max(31),
  category: z.string().max(40).optional().nullable(),
});

export const addBill = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => BillInput.parse(i))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("bills").insert({ ...data, user_id: context.userId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteBill = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("bills").delete().eq("id", data.id).eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const DebtInput = z.object({
  title: z.string().min(1).max(80),
  balance: z.number().min(0).max(1_000_000_000),
  monthly_payment: z.number().min(0).max(100_000_000).optional().nullable(),
  interest_rate: z.number().min(0).max(200).optional().nullable(),
});

export const addDebt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => DebtInput.parse(i))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("debts").insert({ ...data, user_id: context.userId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteDebt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("debts").delete().eq("id", data.id).eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const TxInput = z.object({
  amount: z.number().min(0).max(100_000_000),
  kind: z.enum(["expense", "income", "saving"]),
  category: z.string().max(40).optional().nullable(),
  description: z.string().max(200).optional().nullable(),
  occurred_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
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
