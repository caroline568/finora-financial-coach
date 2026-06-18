import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// A transaction is "incomplete" if either category or note is empty.
// We re-surface ignored ones after a cool-down so users see them again.
const REPROMPT_AFTER_HOURS = 6;
const MAX_AUTO_REPROMPTS = 4;

export const getIncompleteTransactions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("transactions")
      .select(
        "id, amount_kes, type, category, note, transaction_date, counterparty, mpesa_code, prompt_snooze_count, last_prompted_at, prompt_dismissed, created_at",
      )
      .eq("user_id", context.userId)
      .eq("prompt_dismissed", false)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);

    const now = Date.now();
    const cutoff = now - REPROMPT_AFTER_HOURS * 60 * 60 * 1000;

    const items = (data ?? [])
      .filter((t) => {
        const missingCat = !t.category || t.category.trim() === "";
        const missingNote = !t.note || t.note.trim() === "";
        return missingCat || missingNote;
      })
      .map((t) => {
        const missing: ("category" | "note")[] = [];
        if (!t.category || t.category.trim() === "") missing.push("category");
        if (!t.note || t.note.trim() === "") missing.push("note");
        const lastPrompted = t.last_prompted_at
          ? new Date(t.last_prompted_at).getTime()
          : 0;
        const dueAgain =
          lastPrompted === 0 ||
          (lastPrompted < cutoff && t.prompt_snooze_count < MAX_AUTO_REPROMPTS);
        return { ...t, missing, dueAgain };
      });

    return {
      items,
      due: items.filter((i) => i.dueAgain),
    };
  });

const PatchInput = z.object({
  id: z.string().uuid(),
  category: z.string().trim().min(1).max(40).optional(),
  note: z.string().trim().min(1).max(200).optional(),
});

export const completeTransaction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => PatchInput.parse(i))
  .handler(async ({ context, data }) => {
    const patch: Record<string, unknown> = {
      last_prompted_at: new Date().toISOString(),
    };
    if (data.category) patch.category = data.category;
    if (data.note) patch.note = data.note;
    // If both are now filled, mark as resolved (dismissed) so we stop prompting.
    const { data: row, error: readErr } = await context.supabase
      .from("transactions")
      .select("category, note")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);
    const nextCat = data.category ?? row?.category ?? "";
    const nextNote = data.note ?? row?.note ?? "";
    if (nextCat.trim() !== "" && nextNote.trim() !== "") {
      patch.prompt_dismissed = true;
    }

    const { error } = await context.supabase
      .from("transactions")
      .update(patch)
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true, resolved: patch.prompt_dismissed === true };
  });

export const snoozeTransactionPrompt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ id: z.string().uuid() }).parse(i),
  )
  .handler(async ({ context, data }) => {
    const { data: row, error: readErr } = await context.supabase
      .from("transactions")
      .select("prompt_snooze_count")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);
    const next = (row?.prompt_snooze_count ?? 0) + 1;
    const { error } = await context.supabase
      .from("transactions")
      .update({
        prompt_snooze_count: next,
        last_prompted_at: new Date().toISOString(),
      })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true, snooze_count: next };
  });

export const dismissTransactionPrompt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ id: z.string().uuid() }).parse(i),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("transactions")
      .update({ prompt_dismissed: true })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
