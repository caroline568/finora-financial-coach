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
  name: z.string().min(1).max(80).optional(),
  monthly_income: z.number().min(0).max(100_000_000).optional(),
  current_savings: z.number().min(0).max(1_000_000_000).optional(),
  primary_goal: z.string().min(1).max(200).optional(),
  goal_target_amount: z.number().min(0).max(1_000_000_000).optional(),
  goal_current_amount: z.number().min(0).max(1_000_000_000).optional(),
  top_spending_categories: z.array(z.string().min(1).max(40)).max(8).optional(),
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

// Touch streak: call once per day when user opens the app
export const touchStreak = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const today = new Date().toISOString().slice(0, 10);
    const { data: profile, error: getErr } = await context.supabase
      .from("profiles")
      .select("current_streak, longest_streak, last_active_date")
      .eq("id", context.userId)
      .maybeSingle();
    if (getErr) throw new Error(getErr.message);
    if (!profile) return { current_streak: 0, longest_streak: 0 };

    const last = profile.last_active_date;
    let current = profile.current_streak ?? 0;
    let longest = profile.longest_streak ?? 0;

    if (last === today) {
      // already touched today
      return { current_streak: current, longest_streak: longest };
    }

    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    if (last === yesterday) {
      current += 1;
    } else {
      current = 1;
    }
    if (current > longest) longest = current;

    const { error: updErr } = await context.supabase
      .from("profiles")
      .update({ current_streak: current, longest_streak: longest, last_active_date: today })
      .eq("id", context.userId);
    if (updErr) throw new Error(updErr.message);
    return { current_streak: current, longest_streak: longest };
  });
