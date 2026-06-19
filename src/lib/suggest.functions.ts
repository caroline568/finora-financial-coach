import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText, Output } from "ai";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

const CATEGORIES = [
  "Food",
  "Transport",
  "Bills",
  "Airtime/Data",
  "Shopping",
  "Family",
  "Health",
  "Rent",
  "Savings",
  "Debt repayment",
  "Salary",
  "Side hustle",
  "Other",
] as const;

const Input = z.object({ id: z.string().uuid() });

const SuggestionSchema = z.object({
  category: z.enum(CATEGORIES),
  note: z.string().min(2).max(120),
  confidence: z.enum(["low", "medium", "high"]),
});

export const suggestTransactionValues = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => Input.parse(i))
  .handler(async ({ context, data }) => {
    const { data: tx, error } = await context.supabase
      .from("transactions")
      .select(
        "type, amount_kes, category, note, counterparty, counterparty_phone, mpesa_code, raw_sms, transaction_date",
      )
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!tx) throw new Error("Transaction not found");

    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI is not configured");
    const gateway = createLovableAiGatewayProvider(key);

    const facts = [
      `type: ${tx.type}`,
      `amount: KES ${tx.amount_kes}`,
      tx.counterparty ? `counterparty: ${tx.counterparty}` : null,
      tx.counterparty_phone ? `phone: ${tx.counterparty_phone}` : null,
      tx.mpesa_code ? `mpesa code: ${tx.mpesa_code}` : null,
      tx.note ? `existing note: ${tx.note}` : null,
      tx.category ? `existing category: ${tx.category}` : null,
      tx.raw_sms ? `sms: ${tx.raw_sms}` : null,
      `date: ${tx.transaction_date}`,
    ]
      .filter(Boolean)
      .join("\n");

    const { output } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      output: Output.object({ schema: SuggestionSchema }),
      system:
        "You categorise M-Pesa transactions for a Kenyan personal finance app. " +
        "Pick the single best category from the provided list. Write a short, " +
        "human note (max 12 words) that a user would actually recognise — mention " +
        "the counterparty if useful. Never invent facts not in the input.",
      prompt: `Categorise this transaction.\n\n${facts}\n\nAllowed categories: ${CATEGORIES.join(", ")}.`,
    });

    return output;
  });
