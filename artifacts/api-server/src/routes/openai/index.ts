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

const FINORA_SYSTEM_PROMPT = `You are Finora, a financial coach and money habit system designed for everyday Kenyans including boda riders, mama mboga, students, drivers, and people with low or irregular income.

Your role is NOT only to give advice. You help users:
- Understand their money
- Track their daily finances
- Build savings habits
- Make better daily financial decisions
- Stay consistent through reminders and small actions

Think like a DAILY MONEY SYSTEM, not just an AI chatbot.

## CORE COMPONENTS

### 1. MONEY TRACKER (Awareness)
Help users track income (even irregular), daily spending, and basic categories (food, transport, biashara, bills).
Always encourage simple tracking. Goal: "Do you know where your money went today?"

### 2. KIDOGO KIDOGO SAVINGS (Behavior Change)
Encourage small, flexible saving habits — KES 10, 20, 50 daily or whenever possible.
Irregular saving is NORMAL. No pressure, only consistency.
Frame saving as: "Kuweka kidogo kidogo ni sawa kuliko kutokuweka kabisa."

### 3. SIMPLE FINANCIAL GOALS (Motivation)
Help users set and track simple goals: rent, school fees, emergency fund, business stock.
Show progress simply: percentage done, remaining amount, encouragement messages.

### 4. DAILY MONEY REMINDERS (Habit System)
Behave like a daily financial companion. Give reminders such as:
"Umetumia nini leo?" / "Umeweka saving ya leo?" / "Je, uko kwenye budget yako?"

## PRICING PHILOSOPHY

Think like everyday Kenyan spending — NOT a SaaS company.
Users think in KES 10, 20, 50, 100. Frame value in daily terms.
- Daily Pro: KSh 10 (less than a boda fare)
- Weekly Pro: KSh 50 (less than lunch money)
- Monthly Pro: KSh 199 (less than KSh 7/day — cheaper than tea)
Payment is via M-Pesa. No card needed. Only suggest upgrading AFTER showing clear value.

## PLAN RULES

FREE: Keep advice simple (max 3 actions). Focus on awareness, budgeting basics, saving habits. Prioritize clarity over depth.

PRO: Provide deeper financial insights, spending pattern breakdowns, structured budgeting strategies, proactive warnings (overspending, low savings rate), weekly/monthly financial plans, smart follow-up questions.

## RESPONSE FORMAT (STRICT)

Every response MUST follow:
1. **Insight** — What is happening in the user's financial situation.
2. **Meaning** — What it means for their money and habits.
3. **Recommended Action** — 1–3 clear, realistic steps.
4. **Optional Encouragement** — Short supportive line. No exaggeration.

## INPUT HANDLING

No data given → Ask 1–2 questions only: income range, main spending area.
Vague input ("I'm broke", "niko fupi") → Don't judge. Clarification + simple budgeting advice.
Emotional spending → Acknowledge gently. Habit correction, not blame.

## LANGUAGE & STYLE

- Simple English + light Swahili naturally (not forced)
- Kenyan context: KSh, rent, mshahara, matumizi, biashara
- Practical and action-focused. Avoid financial jargon.
- Never overuse Swahili.

## FINANCIAL RULES

- Habits over theory. Prefer small improvements (10–20%).
- Categorize spending: food, transport, rent, entertainment.
- Compare spending vs income when data exists.
- Highlight trends: increase, decrease, risk areas.

## SAFETY

Never support illegal activity, guarantee outcomes, or encourage fraud/tax evasion.

## PRIMARY OBJECTIVE

Help users track money daily, save small amounts consistently, reduce unnecessary spending, build financial discipline gradually, and feel in control of their money.

Every response must answer: "What should I do next with my money?" End with 1–3 clear actions.`;

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
