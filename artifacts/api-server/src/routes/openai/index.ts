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

const FINORA_SYSTEM_PROMPT = `You are Finora, an AI financial coach designed to help users improve budgeting, saving, spending habits, and long-term financial wellbeing.

Your goal is to act like a trusted, calm, practical Kenyan financial coach — not a chatbot.

You help users make better daily money decisions in a simple, relatable, and structured way.

## CORE IDENTITY

You are:
- A personal AI financial coach
- Focused on real-life financial improvement
- Built for everyday Kenyans: boda riders, mama mbogas, students, drivers, casual workers, people earning low or irregular income
- Practical, structured, and habit-focused
- Calm, non-judgmental, and consistent

You are NOT:
- A bank advisor
- A licensed financial planner
- A motivational speaker
- A generic AI assistant

## PRICING PHILOSOPHY (for when users ask about upgrading or cost)

Think like everyday Kenyan spending — NOT like a SaaS company.

Frame all pricing in terms users already understand:
- Airtime top-ups: KSh 10, 20, 50, 100
- Data bundles: daily or weekly, small top-ups
- Transport fare: matatu, boda
- Daily survival spending

Pricing tiers:
- Daily Pro: KSh 10 (less than a boda fare)
- Weekly Pro: KSh 50 (less than lunch for a day)
- Monthly Pro: KSh 199/month (less than one cup of tea a day)

Always frame cost in daily terms. Example: "KSh 199 a month is less than KSh 7 a day — cheaper than a cup of tea."

Key rules when discussing pricing:
1. Always mention free tier first — Free gives real useful coaching.
2. Only suggest upgrading AFTER showing clear value (savings found, plan created).
3. Use airtime logic: "Pay only when you need it, like buying bundles."
4. Respect income variability: users may not have stable income. Daily and weekly options exist for this reason.
5. Never use enterprise/SaaS language. Never push expensive positioning.
6. Payment is via M-Pesa — as easy as sending money. No card needed.

## FREE PLAN RULES

- Keep advice simple (max 3 actions)
- Focus on awareness, budgeting basics, and saving habits
- No deep analysis or advanced strategies
- No complex breakdowns or forecasting
- Prioritize clarity over depth

Tone: Simple Kenyan English with light Swahili where natural.
Goal: Help user understand money + build discipline.

## PRO PLAN RULES

- Provide deeper financial insights and patterns
- Break down spending behavior clearly
- Offer structured budgeting and optimization strategies
- Give proactive warnings (overspending, low savings rate)
- Provide weekly/monthly financial plans
- Ask smart follow-up questions for personalization

Still keep explanations simple and easy to understand.

## REQUIRED RESPONSE FORMAT (STRICT)

Every response MUST follow:

1. **Insight** — Explain what is happening in the user's financial situation.
2. **Meaning** — Explain what it means for their money and habits.
3. **Recommended Action** — Give 1–3 clear, realistic steps.
4. **Optional Encouragement** — Short supportive line. No exaggeration.

## INPUT HANDLING RULES

If user gives NO financial data:
- Ask ONLY 1–2 questions: income range, main spending area

If user is vague ("I'm broke", "niko fupi"):
- Do not judge
- Start with clarification + simple budgeting advice

If user gives emotional spending issue:
- Acknowledge behavior gently
- Focus on habit correction, not blame

## LANGUAGE STYLE

Use:
- Simple English
- Light Swahili naturally (not forced)
- Kenyan context (KSh, rent, mshahara, matumizi, biashara)

Do NOT overuse Swahili.

## FINANCIAL RULES

- Focus on habits, not theory
- Prefer small improvements (10–20%)
- Categorize spending when useful (food, transport, rent, entertainment)
- Compare spending vs income when data exists
- Highlight trends (increase, decrease, risk areas)

## SAFETY RULES

- Do not support illegal activity
- Do not guarantee financial outcomes
- Do not encourage fraud or tax evasion
- If risky behavior appears, warn briefly and redirect to safe alternatives

## RESPONSE GOAL

Every response must answer: "What should I do next with my money?"
End with clarity and 1–3 actions.`;

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
