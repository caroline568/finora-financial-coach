import { Router } from "express";
import { db } from "@workspace/db";
import {
  users, goals, transactions, aiMemory, habitStreaks,
  insertUserSchema, insertGoalSchema, insertTransactionSchema, insertAiMemorySchema,
} from "@workspace/db";
import { eq, and, gte, desc, sql } from "drizzle-orm";
import { z } from "zod/v4";

const router = Router();

/* ── helpers ─────────────────────────────────────────────────────── */
function firstNameOnly(fullName: string) {
  return fullName.trim().split(" ")[0];
}

async function computeHealthScore(userId: number): Promise<number> {
  let score = 50;

  // Income vs expense ratio over last 30 days (max ±20)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentTxns = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.userId, userId), gte(transactions.date, thirtyDaysAgo)));

  const income30 = recentTxns.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expense30 = recentTxns.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  if (income30 > 0) {
    const ratio = expense30 / income30;
    if (ratio < 0.5) score += 20;
    else if (ratio < 0.7) score += 12;
    else if (ratio < 0.9) score += 5;
    else if (ratio >= 1.0) score -= 15;
  }

  // Transaction tracking over last 7 days (max +10)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const weekCount = recentTxns.filter(t => new Date(t.date) >= sevenDaysAgo).length;
  if (weekCount >= 7) score += 10;
  else if (weekCount >= 4) score += 6;
  else if (weekCount >= 1) score += 3;
  else score -= 5;

  // Savings streak (max +15)
  const [savingsStreak] = await db
    .select()
    .from(habitStreaks)
    .where(and(eq(habitStreaks.userId, userId), eq(habitStreaks.habitType, "savings")));
  const streak = savingsStreak?.currentStreak ?? 0;
  if (streak >= 30) score += 15;
  else if (streak >= 14) score += 10;
  else if (streak >= 7) score += 6;
  else if (streak >= 3) score += 3;

  // Goal progress (max +10)
  const activeGoals = await db
    .select()
    .from(goals)
    .where(and(eq(goals.userId, userId), eq(goals.status, "active")));
  const hasProgress = activeGoals.some(g => (g.currentAmount ?? 0) > 0);
  const hasHalfway = activeGoals.some(g => (g.currentAmount ?? 0) >= (g.targetAmount * 0.5));
  if (hasProgress) score += 5;
  if (hasHalfway) score += 5;

  return Math.max(0, Math.min(100, Math.round(score)));
}

/* ── POST /api/users  (create / register) ────────────────────────── */
router.post("/", async (req, res) => {
  const parsed = insertUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body", issues: parsed.error.issues });
    return;
  }
  const [user] = await db.insert(users).values(parsed.data).returning();
  res.status(201).json(user);
});

/* ── GET /api/users/:id  (profile + computed stats) ──────────────── */
router.get("/:id", async (req, res) => {
  const userId = Number(req.params.id);
  if (isNaN(userId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const healthScore = await computeHealthScore(userId);
  await db.update(users).set({ healthScore }).where(eq(users.id, userId));

  res.json({ ...user, healthScore });
});

/* ── PUT /api/users/:id  (update profile) ────────────────────────── */
router.put("/:id", async (req, res) => {
  const userId = Number(req.params.id);
  if (isNaN(userId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const allowed = [
    "name","email","phone","occupation","incomeType","incomeRange",
    "payFrequency","dependants","financialPersonality","financialChallenges",
    "onboardingComplete","avatarUrl"
  ] as const;
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in req.body) update[key] = req.body[key as string];
  }
  update.updatedAt = new Date();

  const [updated] = await db.update(users).set(update as Parameters<typeof db.update>[0]).where(eq(users.id, userId)).returning();
  if (!updated) { res.status(404).json({ error: "User not found" }); return; }
  res.json(updated);
});

/* ── GET /api/users/:id/health-score ─────────────────────────────── */
router.get("/:id/health-score", async (req, res) => {
  const userId = Number(req.params.id);
  if (isNaN(userId)) { res.status(400).json({ error: "Invalid id" }); return; }
  const score = await computeHealthScore(userId);
  await db.update(users).set({ healthScore: score }).where(eq(users.id, userId));
  res.json({ score });
});

/* ═══ GOALS ═══════════════════════════════════════════════════════ */

/* GET /api/users/:id/goals */
router.get("/:id/goals", async (req, res) => {
  const userId = Number(req.params.id);
  if (isNaN(userId)) { res.status(400).json({ error: "Invalid id" }); return; }
  const rows = await db.select().from(goals).where(eq(goals.userId, userId)).orderBy(desc(goals.createdAt));
  res.json(rows.map(g => ({ ...g, createdAt: g.createdAt.toISOString(), updatedAt: g.updatedAt.toISOString(), deadline: g.deadline?.toISOString() ?? null })));
});

/* POST /api/users/:id/goals */
router.post("/:id/goals", async (req, res) => {
  const userId = Number(req.params.id);
  if (isNaN(userId)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = insertGoalSchema.safeParse({ ...req.body, userId });
  if (!parsed.success) { res.status(400).json({ error: "Invalid body", issues: parsed.error.issues }); return; }
  const [row] = await db.insert(goals).values(parsed.data).returning();
  res.status(201).json({ ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(), deadline: row.deadline?.toISOString() ?? null });
});

/* PUT /api/users/:id/goals/:goalId */
router.put("/:id/goals/:goalId", async (req, res) => {
  const userId = Number(req.params.id);
  const goalId = Number(req.params.goalId);
  if (isNaN(userId) || isNaN(goalId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const allowed = ["title","emoji","category","targetAmount","currentAmount","deadline","status"];
  const update: Record<string, unknown> = { updatedAt: new Date() };
  for (const key of allowed) {
    if (key in req.body) update[key] = req.body[key as string];
  }
  // Auto-complete
  if ("currentAmount" in update && "targetAmount" in req.body) {
    if (Number(update.currentAmount) >= Number(req.body.targetAmount)) update.status = "completed";
  }

  const [row] = await db.update(goals).set(update as Parameters<typeof db.update>[0]).where(and(eq(goals.id, goalId), eq(goals.userId, userId))).returning();
  if (!row) { res.status(404).json({ error: "Goal not found" }); return; }
  res.json({ ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(), deadline: row.deadline?.toISOString() ?? null });
});

/* DELETE /api/users/:id/goals/:goalId */
router.delete("/:id/goals/:goalId", async (req, res) => {
  const userId = Number(req.params.id);
  const goalId = Number(req.params.goalId);
  if (isNaN(userId) || isNaN(goalId)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(goals).where(and(eq(goals.id, goalId), eq(goals.userId, userId)));
  res.status(204).send();
});

/* ═══ TRANSACTIONS ════════════════════════════════════════════════ */

/* GET /api/users/:id/transactions */
router.get("/:id/transactions", async (req, res) => {
  const userId = Number(req.params.id);
  if (isNaN(userId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const rows = await db
    .select()
    .from(transactions)
    .where(eq(transactions.userId, userId))
    .orderBy(desc(transactions.date))
    .limit(limit);
  res.json(rows.map(t => ({ ...t, date: t.date.toISOString(), createdAt: t.createdAt.toISOString() })));
});

/* POST /api/users/:id/transactions */
router.post("/:id/transactions", async (req, res) => {
  const userId = Number(req.params.id);
  if (isNaN(userId)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = insertTransactionSchema.safeParse({ ...req.body, userId });
  if (!parsed.success) { res.status(400).json({ error: "Invalid body", issues: parsed.error.issues }); return; }
  const [row] = await db.insert(transactions).values(parsed.data).returning();

  // Update savings streak when type is income or description mentions savings
  if (req.body.type === "expense" && req.body.category === "savings") {
    await updateStreak(userId, "savings");
  }
  // Always update daily-tracking streak
  await updateStreak(userId, "daily-tracking");

  res.status(201).json({ ...row, date: row.date.toISOString(), createdAt: row.createdAt.toISOString() });
});

/* DELETE /api/users/:id/transactions/:txId */
router.delete("/:id/transactions/:txId", async (req, res) => {
  const userId = Number(req.params.id);
  const txId = Number(req.params.txId);
  if (isNaN(userId) || isNaN(txId)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(transactions).where(and(eq(transactions.id, txId), eq(transactions.userId, userId)));
  res.status(204).send();
});

/* ═══ AI MEMORY ═══════════════════════════════════════════════════ */

/* GET /api/users/:id/ai-memory */
router.get("/:id/ai-memory", async (req, res) => {
  const userId = Number(req.params.id);
  if (isNaN(userId)) { res.status(400).json({ error: "Invalid id" }); return; }
  const limit = Math.min(Number(req.query.limit) || 30, 100);
  const rows = await db
    .select()
    .from(aiMemory)
    .where(eq(aiMemory.userId, userId))
    .orderBy(desc(aiMemory.createdAt))
    .limit(limit);
  res.json(rows.map(m => ({ ...m, createdAt: m.createdAt.toISOString() })));
});

/* POST /api/users/:id/ai-memory */
router.post("/:id/ai-memory", async (req, res) => {
  const userId = Number(req.params.id);
  if (isNaN(userId)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = insertAiMemorySchema.safeParse({ ...req.body, userId });
  if (!parsed.success) { res.status(400).json({ error: "Invalid body" }); return; }
  const [row] = await db.insert(aiMemory).values(parsed.data).returning();
  res.status(201).json({ ...row, createdAt: row.createdAt.toISOString() });
});

/* ═══ STREAKS ══════════════════════════════════════════════════════ */

async function updateStreak(userId: number, habitType: string) {
  const [existing] = await db
    .select()
    .from(habitStreaks)
    .where(and(eq(habitStreaks.userId, userId), eq(habitStreaks.habitType, habitType)));

  const now = new Date();
  if (!existing) {
    await db.insert(habitStreaks).values({
      userId, habitType, currentStreak: 1, longestStreak: 1, totalCheckIns: 1, lastCheckIn: now,
    });
    return;
  }

  const lastCheckIn = existing.lastCheckIn ? new Date(existing.lastCheckIn) : null;
  const daysSinceLast = lastCheckIn
    ? Math.floor((now.getTime() - lastCheckIn.getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  if (daysSinceLast === 0) return; // Already checked in today

  const newStreak = daysSinceLast === 1 ? (existing.currentStreak ?? 0) + 1 : 1;
  const longestStreak = Math.max(existing.longestStreak ?? 0, newStreak);

  await db.update(habitStreaks).set({
    currentStreak: newStreak,
    longestStreak,
    totalCheckIns: (existing.totalCheckIns ?? 0) + 1,
    lastCheckIn: now,
    updatedAt: now,
  }).where(eq(habitStreaks.id, existing.id));
}

/* GET /api/users/:id/streaks */
router.get("/:id/streaks", async (req, res) => {
  const userId = Number(req.params.id);
  if (isNaN(userId)) { res.status(400).json({ error: "Invalid id" }); return; }
  const rows = await db.select().from(habitStreaks).where(eq(habitStreaks.userId, userId));
  res.json(rows.map(s => ({ ...s, lastCheckIn: s.lastCheckIn?.toISOString() ?? null, updatedAt: s.updatedAt.toISOString() })));
});

/* GET /api/users/:id/summary  (dashboard stats) ─────────────────── */
router.get("/:id/summary", async (req, res) => {
  const userId = Number(req.params.id);
  if (isNaN(userId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const monthTxns = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.userId, userId), gte(transactions.date, startOfMonth)));

  const income = monthTxns.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expenses = monthTxns.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  // Category breakdown for expenses
  const categoryMap: Record<string, number> = {};
  for (const t of monthTxns.filter(t => t.type === "expense")) {
    categoryMap[t.category] = (categoryMap[t.category] ?? 0) + t.amount;
  }

  const activeGoals = await db.select().from(goals).where(and(eq(goals.userId, userId), eq(goals.status, "active")));
  const streaks = await db.select().from(habitStreaks).where(eq(habitStreaks.userId, userId));

  res.json({
    monthlyIncome: income,
    monthlyExpenses: expenses,
    net: income - expenses,
    expensesByCategory: categoryMap,
    activeGoalCount: activeGoals.length,
    streaks: streaks.map(s => ({ ...s, lastCheckIn: s.lastCheckIn?.toISOString() ?? null, updatedAt: s.updatedAt.toISOString() })),
  });
});

export { computeHealthScore };
export default router;
