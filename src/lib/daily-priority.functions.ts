import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText } from "ai";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getOrGenerateDailyPriority = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const today = new Date().toISOString().slice(0, 10);

    // Check cache
    const { data: existing } = await context.supabase
      .from("daily_priorities")
      .select("*")
      .eq("user_id", context.userId)
      .eq("priority_date", today)
      .maybeSingle();
    if (existing) return { priority: existing, cached: true };

    const { loadFinanceContext } = await import("./finora-context.server");
    const { buildFinoraSystemPrompt, DAILY_PRIORITY_INSTRUCTION } = await import("./finora-prompt.server");
    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");

    const ctx = await loadFinanceContext(context.supabase, context.userId);
    if (
      !ctx.monthly_income_kes &&
      !ctx.bills.length &&
      !ctx.debts.length &&
      !ctx.current_savings_kes
    ) {
      return {
        priority: {
          recommendation:
            "Tell me a little about your money so I can coach you well — your income, your goal, and any bills or debts on your mind.",
          reasoning:
            "I need a basic picture before I can give you a priority that actually fits your life. Even rough numbers are enough to start.",
          goal_connection: null,
          encouragement: "Karibu. Let's start something good today.",
          priority_date: today,
          is_done: false,
        },
        cached: false,
      };
    }

    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const system = buildFinoraSystemPrompt(ctx);
    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("google/gemini-3-flash-preview");

    const { text } = await generateText({
      model,
      system,
      prompt: DAILY_PRIORITY_INSTRUCTION,
    });

    let parsed: {
      recommendation: string;
      reasoning: string;
      goal_connection: string | null;
      encouragement: string;
    };
    try {
      const cleaned = text.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = {
        recommendation: text.slice(0, 280),
        reasoning: "",
        goal_connection: null,
        encouragement: "",
      };
    }

    const { data: saved, error: insErr } = await context.supabase
      .from("daily_priorities")
      .insert({
        user_id: context.userId,
        priority_date: today,
        recommendation: parsed.recommendation,
        reasoning: parsed.reasoning,
        goal_connection: parsed.goal_connection,
        encouragement: parsed.encouragement,
      })
      .select("*")
      .single();
    if (insErr) throw new Error(insErr.message);

    return { priority: saved, cached: false };
  });

export const regenerateDailyPriority = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const today = new Date().toISOString().slice(0, 10);
    await context.supabase
      .from("daily_priorities")
      .delete()
      .eq("user_id", context.userId)
      .eq("priority_date", today);
    return { ok: true };
  });

export const markPriorityDone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ id: z.string().uuid(), is_done: z.boolean() }).parse(i),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("daily_priorities")
      .update({
        is_done: data.is_done,
        completed_at: data.is_done ? new Date().toISOString() : null,
      })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
