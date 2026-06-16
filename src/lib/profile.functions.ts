import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("*")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { profile: data };
  });

const ProfileUpdate = z.object({
  full_name: z.string().min(1).max(80).optional(),
  mpesa_phone: z.string().max(20).optional().nullable(),
  monthly_income_kes: z.number().int().min(0).max(100_000_000).optional(),
  current_savings_kes: z.number().int().min(0).max(1_000_000_000).optional(),
  active_debts_kes: z.number().int().min(0).max(1_000_000_000).optional(),
  primary_goal: z.string().min(1).max(200).optional(),
  spending_categories: z.array(z.string().min(1).max(40)).max(8).optional(),
  onboarded: z.boolean().optional(),
});

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ProfileUpdate.parse(input))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update(data)
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getStreak = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("streaks")
      .select("current_streak, longest_streak, last_action_date")
      .eq("user_id", context.userId)
      .maybeSingle();
    return {
      current_streak: data?.current_streak ?? 0,
      longest_streak: data?.longest_streak ?? 0,
      last_action_date: data?.last_action_date ?? null,
    };
  });

// Touch streak: call once per day when user opens the app
export const touchStreak = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const today = new Date().toISOString().slice(0, 10);

    // Ensure a streak row exists (signup trigger creates one, but be safe)
    const { data: existing } = await context.supabase
      .from("streaks")
      .select("current_streak, longest_streak, last_action_date")
      .eq("user_id", context.userId)
      .maybeSingle();

    let current = existing?.current_streak ?? 0;
    let longest = existing?.longest_streak ?? 0;
    const last = existing?.last_action_date ?? null;

    if (last === today) {
      return { current_streak: current, longest_streak: longest };
    }

    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    current = last === yesterday ? current + 1 : 1;
    if (current > longest) longest = current;

    if (existing) {
      const { error } = await context.supabase
        .from("streaks")
        .update({ current_streak: current, longest_streak: longest, last_action_date: today })
        .eq("user_id", context.userId);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase
        .from("streaks")
        .insert({
          user_id: context.userId,
          current_streak: current,
          longest_streak: longest,
          last_action_date: today,
        });
      if (error) throw new Error(error.message);
    }
    return { current_streak: current, longest_streak: longest };
  });
