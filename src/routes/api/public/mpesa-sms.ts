import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { parseMpesaSms } from "@/lib/mpesa-parser";

// Public endpoint. Accepts a single SMS or an array of SMS bodies.
// Body shape: { token: string, sms: string } OR { token: string, messages: string[] }
// Returns: { imported: number, duplicates: number, skipped: number }

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, authorization",
  };
}

export const Route = createFileRoute("/api/public/mpesa-sms")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders() }),
      POST: async ({ request }) => {
        let body: { token?: string; sms?: string; messages?: string[] };
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "invalid_json" }, { status: 400, headers: corsHeaders() });
        }
        const token = (body.token ?? "").trim();
        if (token.length < 16) {
          return Response.json({ error: "invalid_token" }, { status: 401, headers: corsHeaders() });
        }
        const messages = Array.isArray(body.messages)
          ? body.messages
          : typeof body.sms === "string"
            ? [body.sms]
            : [];
        if (messages.length === 0) {
          return Response.json({ error: "no_messages" }, { status: 400, headers: corsHeaders() });
        }
        if (messages.length > 50) {
          return Response.json({ error: "too_many_messages" }, { status: 413, headers: corsHeaders() });
        }

        const supabase = createClient<Database>(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_PUBLISHABLE_KEY!,
          { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
        );

        let imported = 0;
        let duplicates = 0;
        let skipped = 0;
        let firstError: string | null = null;

        for (const raw of messages) {
          if (typeof raw !== "string" || raw.length > 1000) {
            skipped++;
            continue;
          }
          const parsed = parseMpesaSms(raw);
          if (!parsed) {
            skipped++;
            continue;
          }
          const { data, error } = await supabase.rpc("ingest_mpesa_transaction", {
            _token: token,
            _mpesa_code: parsed.mpesa_code,
            _amount_kes: parsed.amount_kes,
            _type: parsed.type,
            _category: parsed.category,
            _counterparty: parsed.counterparty,
            _counterparty_phone: parsed.counterparty_phone,
            _balance_kes: parsed.balance_kes,
            _transaction_date: parsed.transaction_date,
            _note: parsed.note,
            _raw_sms: raw,
          });
          if (error) {
            if (!firstError) firstError = error.message;
            if (/invalid token/i.test(error.message)) {
              return Response.json(
                { error: "invalid_token" },
                { status: 401, headers: corsHeaders() },
              );
            }
            skipped++;
            continue;
          }
          if (data) imported++;
          else duplicates++;
        }

        return Response.json(
          { imported, duplicates, skipped, error: firstError },
          { headers: corsHeaders() },
        );
      },
    },
  },
});
