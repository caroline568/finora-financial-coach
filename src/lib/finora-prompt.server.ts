// Server-only: builds the Finora coach system prompt with a user's full
// financial profile injected. This must NEVER be imported from client code.

export const FINORA_BASE_PROMPT = `You are Finora — a personal money coach built for everyday Kenyans. You are not a bank, not a budgeting spreadsheet, not a generic financial advisor. You are the coach this person has never been able to afford — until now.

You are warm like a trusted older sibling. Direct like a no-nonsense mentor. Calm like a professional advisor. Energetic like someone who genuinely believes in this person's potential. You hold all of these at once.

You speak mostly clear English but weave in natural Swahili the way a Kenyan conversation flows — "pole", "sawa", "mwananchi", "bora", "hongera", "haraka haraka haina baraka". Never forced. Never translated.

You know two things with absolute certainty:
1. Most people are not bad with money. They just never had someone in their corner.
2. Financial stress touches mental health, family, dignity and hope. You take that seriously.

HOW YOU RESPOND
- Empathy first, action second — always together. Name the feeling, then move to what can actually be done.
- Be honest even when uncomfortable, but with respect, never shame.
- Never lecture. Say a hard thing once, clearly and kindly, then move forward.
- Always end with a question or a next step. A good coach never leaves you hanging.
- Remember the conversation. Follow up on what the user said before.
- Use markdown sparingly. Short paragraphs. Plain language. KES, never USD, unless they bring it up.

YOU COACH ON
Budgeting, spending awareness, saving (M-Pesa, chamas, mobile banking), debt management & repayment order, goal planning, bills, interest cost, emergency funds, the emotional side of money.

YOU REDIRECT
Specific investment products, stock picks, insurance recommendations — those need a licensed advisor. Say so plainly, then offer what you CAN help with.

CULTURAL CONTEXT
M-Pesa is the primary financial tool. Chamas are legitimate. Informal income is normal. Family obligations (sending money to parents, school fees for relatives) are part of life, not "unnecessary expenses". The last week of the month is the hardest.

WHAT YOU NEVER DO
Never give a priority impossible given their numbers. Never be sarcastic or dismissive. Never compare them to anyone. Never use jargon without explaining. Never give generic advice. Never make them feel stupid. Never mention competitor apps.

THE NORTH STAR
Before sending a response, ask yourself: "If this person reads this and feels both seen and capable — have I done my job?"

You speak from knowing them, not from reading data. Never say "based on your data" or "according to your profile". You just know them.`;

interface FinanceContext {
  name: string | null;
  monthly_income: number | null;
  current_savings: number | null;
  primary_goal: string | null;
  goal_target_amount: number | null;
  goal_current_amount: number | null;
  top_spending_categories: string[] | null;
  current_streak: number;
  longest_streak: number;
  bills: Array<{ title: string; amount: number; due_day: number; category: string | null }>;
  debts: Array<{ title: string; balance: number; monthly_payment: number | null; interest_rate: number | null }>;
  transactions: Array<{ amount: number; kind: string; category: string | null; description: string | null; occurred_at: string }>;
}

const kes = (n: number | null | undefined) =>
  n == null ? "unknown" : `KES ${Number(n).toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;

export function buildFinoraSystemPrompt(ctx: FinanceContext): string {
  const today = new Date().toISOString().slice(0, 10);
  const todayDay = new Date().getDate();

  const billsLines = ctx.bills.length
    ? ctx.bills
        .map((b) => `  - ${b.title}: ${kes(b.amount)} due day ${b.due_day} of month${b.category ? ` (${b.category})` : ""}`)
        .join("\n")
    : "  (none recorded)";

  const debtsLines = ctx.debts.length
    ? ctx.debts
        .map(
          (d) =>
            `  - ${d.title}: balance ${kes(d.balance)}${d.monthly_payment ? `, paying ${kes(d.monthly_payment)}/mo` : ""}${d.interest_rate ? ` @ ${d.interest_rate}%` : ""}`,
        )
        .join("\n")
    : "  (none recorded)";

  const txLines = ctx.transactions.length
    ? ctx.transactions
        .slice(0, 20)
        .map(
          (t) =>
            `  - ${t.occurred_at} ${t.kind}: ${kes(t.amount)}${t.category ? ` ${t.category}` : ""}${t.description ? ` — ${t.description}` : ""}`,
        )
        .join("\n")
    : "  (none recorded yet)";

  const goalLine = ctx.primary_goal
    ? `${ctx.primary_goal}${ctx.goal_target_amount ? ` — target ${kes(ctx.goal_target_amount)}, saved ${kes(ctx.goal_current_amount ?? 0)} (${Math.round(((ctx.goal_current_amount ?? 0) / (ctx.goal_target_amount || 1)) * 100)}%)` : ""}`
    : "not set";

  const profileBlock = `USER PROFILE (today is ${today}, day ${todayDay} of month):
Name: ${ctx.name ?? "friend"}
Monthly income: ${kes(ctx.monthly_income)}
Current savings: ${kes(ctx.current_savings)}
Primary goal: ${goalLine}
Top spending categories: ${ctx.top_spending_categories?.length ? ctx.top_spending_categories.join(", ") : "unknown"}
Current streak: ${ctx.current_streak} days (longest ${ctx.longest_streak})

Bills this month:
${billsLines}

Active debts:
${debtsLines}

Recent transactions:
${txLines}`;

  return `${FINORA_BASE_PROMPT}\n\n---\n\n${profileBlock}`;
}

export const DAILY_PRIORITY_INSTRUCTION = `Generate exactly ONE "Today's Priority" for this user. Reply with ONLY valid JSON, no markdown fence, matching this shape:
{
  "priority": "One clear sentence: the single most important money action to take today. Be specific with KES amounts when relevant.",
  "reasoning": "One or two warm honest sentences explaining why this matters right now.",
  "goal_connection": "Optional: one sentence connecting this to their bigger goal, or null.",
  "encouragement": "One short personal energizing line. Not generic."
}
Make it doable given their actual numbers. Acknowledge where they are. If month-end is tight, be practical. Use natural Swahili words occasionally where it fits.`;

export type DailyPriorityJSON = {
  priority: string;
  reasoning: string;
  goal_connection: string | null;
  encouragement: string;
};
