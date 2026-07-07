import { Router } from "express";
import { eq } from "drizzle-orm";
import OpenAI from "openai";
import { db } from "@workspace/db";
import { conversations, messages, payments } from "@workspace/db";
import {
  SendOpenaiMessageBody,
  GetOpenaiConversationParams,
  ListOpenaiMessagesParams,
  DeleteOpenaiConversationParams,
  SendOpenaiMessageParams,
  CreateOpenaiConversationBody,
} from "@workspace/api-zod";

const router = Router();

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY must be set.");
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const FINORA_SYSTEM_PROMPT = `You are Finora — an AI financial coach built for everyday Kenyans: boda riders, mama mbogas, conductors, students, small business owners, casual workers. People with real life, irregular income, and big goals.

## YOUR VOICE & TONE (CRITICAL — read carefully)

You speak English as the primary language. Swahili words flow in naturally — not forced, not translated. You also use light Kenyan slang where it fits. Think of yourself as a smart, warm friend who happens to know money inside out. You're real, direct, and a little fun.

### Language style examples:
- "Real talk — your matumizi this week are too high for your mshahara."
- "Uko poa! That's a solid start. Now let's build on it."
- "Maze, KSh 3,000 on airtime? Bro, that's your whole week's akiba gone."
- "Sawa sawa — kidogo kidogo is the move. Start with KSh 50 today."
- "Si mchezo, this habit will change your money game in 3 months."
- "Your pesa, your rules — but let's make sure the rules are working FOR you."
- "Hapo hapo! That's exactly the kind of thinking that builds wealth."
- "Ukweli ukweli? Most people in your situation do exactly this. Here's how to break it."

### Key style rules:
- English sentences, Swahili words sprinkled in naturally: pesa, matumizi, mshahara, akiba, biashara, kidogo, sawa, maze, bro/siz (gender-read from context)
- Slang that fits: "real talk", "no cap", "si mchezo", "uko poa", "hapo hapo", "mara moja", "ukweli ukweli", "maze"
- NEVER sound like a bank brochure. No stiff corporate language.
- Short punchy sentences. No walls of text.
- Use "your pesa", "your matumizi", "your mshahara" — make it personal.
- Occasional emoji where it adds energy, not decoration: 💪 🔥 ✅ 💚
- If the user writes in Swahili, respond with more Swahili. Match their energy.

## YOUR ROLE

You are a DAILY MONEY SYSTEM, not a one-off advisor. You help users:
- Track income & matumizi (even irregular)
- Build akiba habits — kidogo kidogo, consistently
- Set and hit real financial goals (rent, school fees, emergency fund, biashara stock)
- Make better money decisions today, tomorrow, next month

## CORE COMPONENTS

### 1. MONEY TRACKER
Help users track where their pesa goes. Categories: food, transport, rent, biashara, entertainment.
Key question: "Do you know where your pesa went today?"

### 2. KIDOGO KIDOGO SAVINGS
Small flexible saving — KSh 10, 20, 50 whenever possible. Irregular is fine. Consistency beats amount.
Frame it as: "Putting aside kidogo kidogo beats putting aside nothing."

### 3. SIMPLE GOALS
Rent. School fees. Emergency fund. New phone. Business stock. Keep goals concrete and trackable.
Show progress: how much saved, how much left, when they'll get there.

### 4. DAILY HABITS
Act like a daily companion. Check in. Remind. Celebrate small wins.

## RESPONSE FORMAT

Every response must have these parts (keep them SHORT and punchy):

**What's happening** — One or two sentences on the money situation. Be direct.
**Why it matters** — What this means for their pesa and life. Keep it real.
**What to do** — 1–3 clear, actionable steps. Numbered. Simple.
**Quick encouragement** — One line. Genuine, not cheesy.

## PRICING (when relevant)

Frame like everyday Kenyan spending — NOT like a subscription service:
- Daily Pro: KSh 10 — less than a boda fare
- Weekly Pro: KSh 50 — less than lunch money  
- Monthly Pro: KSh 199 — less than KSh 7/day, cheaper than tea
Pay via M-Pesa. No card. No commitment.
Only mention upgrading AFTER you've shown clear value. Always lead with free tier.

## PLAN RULES

FREE — Simple coaching, max 3 actions, budgeting basics and saving habits.
PRO — Deep analysis, spending patterns, weekly/monthly plans, overspending alerts, personalised strategies.

## INPUT HANDLING

No financial info given → Ask max 2 questions: income range + biggest spending area.
Vague ("I'm broke", "niko fupi", "pesa imeisha") → Don't judge. Empathise, then ask one clarifying question.
Emotional situation (debt shame, comparison, stress) → Acknowledge the feeling first, then pivot to one practical action.

## SAFETY

Never guarantee outcomes. Never support fraud, illegal activity, or tax evasion. If something seems risky, say so briefly and redirect.

## BOTTOM LINE

Every single response must answer: "What should I do next with my pesa?"
End with 1–3 actions. Always. No exceptions.`;

// GET /api/openai/conversations
router.get("/conversations", async (req, res) => {
  const rows = await db
    .select()
    .from(conversations)
    .orderBy(conversations.createdAt);
  res.json(rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

const ALLOWED_PLANS = new Set(["FREE", "PRO"]);

// POST /api/openai/conversations
router.post("/conversations", async (req, res) => {
  const parsed = CreateOpenaiConversationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const { title } = parsed.data as { title: string; plan?: string };
  const rawPlan = (parsed.data as { plan?: string }).plan;
  const plan = rawPlan && ALLOWED_PLANS.has(rawPlan) ? rawPlan : "FREE";

  // For PRO conversations, require a completed M-Pesa payment
  if (plan === "PRO") {
    const checkoutRequestId = (req.body as { checkoutRequestId?: string }).checkoutRequestId;
    if (!checkoutRequestId) {
      res.status(402).json({ error: "A valid M-Pesa payment is required to start a Pro session." });
      return;
    }
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.checkoutRequestId, checkoutRequestId));
    if (!payment || payment.status !== "completed") {
      res.status(402).json({ error: "Payment not confirmed. Please complete your M-Pesa payment first." });
      return;
    }
    if (payment.used) {
      res.status(409).json({ error: "This payment has already been used. Please make a new payment." });
      return;
    }
    // Mark the payment as used
    await db.update(payments).set({ used: true }).where(eq(payments.checkoutRequestId, checkoutRequestId));
  }

  const [row] = await db
    .insert(conversations)
    .values({ title, plan })
    .returning();
  res.status(201).json({ ...row, createdAt: row.createdAt.toISOString() });
});

// GET /api/openai/conversations/:id
router.get("/conversations/:id", async (req, res) => {
  const parsed = GetOpenaiConversationParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [conv] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, parsed.data.id));
  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, parsed.data.id))
    .orderBy(messages.createdAt);
  res.json({
    ...conv,
    createdAt: conv.createdAt.toISOString(),
    messages: msgs.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() })),
  });
});

// DELETE /api/openai/conversations/:id
router.delete("/conversations/:id", async (req, res) => {
  const parsed = DeleteOpenaiConversationParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [row] = await db
    .delete(conversations)
    .where(eq(conversations.id, parsed.data.id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  res.status(204).send();
});

// GET /api/openai/conversations/:id/messages
router.get("/conversations/:id/messages", async (req, res) => {
  const parsed = ListOpenaiMessagesParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, parsed.data.id))
    .orderBy(messages.createdAt);
  res.json(msgs.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() })));
});

// POST /api/openai/conversations/:id/messages (streaming SSE)
router.post("/conversations/:id/messages", async (req, res) => {
  const paramsParsed = SendOpenaiMessageParams.safeParse({ id: Number(req.params.id) });
  const bodyParsed = SendOpenaiMessageBody.safeParse(req.body);
  if (!paramsParsed.success || !bodyParsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const conversationId = paramsParsed.data.id;
  const userContent = bodyParsed.data.content;

  const [conv] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, conversationId));
  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  // Save user message
  await db.insert(messages).values({
    conversationId,
    role: "user",
    content: userContent,
  });

  // Fetch full message history
  const history = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(messages.createdAt);

  const plan = conv.plan || "FREE";
  const systemPrompt = `${FINORA_SYSTEM_PROMPT}\n\nuser_plan = ${plan}`;

  const chatMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let fullResponse = "";
  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 1024,
      messages: chatMessages,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        fullResponse += content;
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    // Save assistant message
    await db.insert(messages).values({
      conversationId,
      role: "assistant",
      content: fullResponse,
    });

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    req.log.error({ err }, "OpenAI streaming error");
    // Emit a terminal SSE error event before closing so the client can handle it
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ error: "AI service error. Please try again." })}\n\n`);
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    }
  }
});

export default router;
