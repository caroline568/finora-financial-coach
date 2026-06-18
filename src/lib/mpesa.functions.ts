import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { parseMpesaSms } from "@/lib/mpesa-parser";

export const getIngestToken = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("ingest_token")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { token: data?.ingest_token ?? null };
  });

export const rotateIngestToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("rotate_ingest_token");
    if (error) throw new Error(error.message);
    return { token: data as string };
  });

// Paste-an-SMS path (signed-in user pastes one or more M-Pesa SMS).
export const importMpesaSms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ text: z.string().min(10).max(20000) }).parse(i),
  )
  .handler(async ({ context, data }) => {
    const blocks = data.text
      .split(/\n{2,}|(?=\b[A-Z0-9]{10}\s+Confirmed)/)
      .map((s) => s.trim())
      .filter((s) => s.length > 20);
    let imported = 0;
    let duplicates = 0;
    let skipped = 0;
    for (const raw of blocks) {
      const parsed = parseMpesaSms(raw);
      if (!parsed) {
        skipped++;
        continue;
      }
      const { error } = await context.supabase.from("transactions").insert({
        user_id: context.userId,
        type: parsed.type,
        amount_kes: parsed.amount_kes,
        category: parsed.category,
        note: parsed.note,
        source: "mpesa_sms",
        transaction_date: parsed.transaction_date,
        mpesa_code: parsed.mpesa_code,
        counterparty: parsed.counterparty,
        counterparty_phone: parsed.counterparty_phone,
        balance_kes: parsed.balance_kes,
        raw_sms: raw,
      });
      if (error) {
        if (/duplicate key/i.test(error.message)) duplicates++;
        else skipped++;
      } else {
        imported++;
      }
    }
    return { imported, duplicates, skipped };
  });
