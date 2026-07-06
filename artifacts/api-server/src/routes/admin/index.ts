import { Router } from "express";
import { db } from "@workspace/db";
import { conversations, messages } from "@workspace/db";
import { sql, eq, desc, count } from "drizzle-orm";

const router = Router();

const ADMIN_KEY = process.env.ADMIN_KEY;
if (!ADMIN_KEY) {
  throw new Error("ADMIN_KEY env var must be set to enable the admin API.");
}

function requireAdmin(req: any, res: any, next: any) {
  const key = req.headers["x-admin-key"];
  if (!key || key !== ADMIN_KEY) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

// GET /api/admin/stats — high-level numbers
router.get("/stats", requireAdmin, async (req, res) => {
  const [totalConvos] = await db
    .select({ count: count() })
    .from(conversations);

  const [totalMessages] = await db
    .select({ count: count() })
    .from(messages);

  const planBreakdown = await db
    .select({ plan: conversations.plan, count: count() })
    .from(conversations)
    .groupBy(conversations.plan);

  const [avgMessages] = await db
    .select({
      avg: sql<string>`ROUND(AVG(msg_count), 1)`,
    })
    .from(
      db
        .select({ msg_count: count().as("msg_count") })
        .from(messages)
        .groupBy(messages.conversationId)
        .as("sub")
    );

  // Messages in last 7 days by day
  const activity = await db.execute(
    sql`
      SELECT
        DATE_TRUNC('day', created_at AT TIME ZONE 'Africa/Nairobi') AS day,
        COUNT(*)::int AS message_count
      FROM messages
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY day
      ORDER BY day ASC
    `
  );

  res.json({
    totalConversations: totalConvos.count,
    totalMessages: totalMessages.count,
    avgMessagesPerConversation: parseFloat(avgMessages?.avg || "0"),
    planBreakdown: planBreakdown.reduce(
      (acc, r) => ({ ...acc, [r.plan]: r.count }),
      {} as Record<string, number>
    ),
    activityLast7Days: activity.rows,
  });
});

// GET /api/admin/conversations — paginated list with message counts
router.get("/conversations", requireAdmin, async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = 20;
  const offset = (page - 1) * limit;

  const rows = await db
    .select({
      id: conversations.id,
      title: conversations.title,
      plan: conversations.plan,
      createdAt: conversations.createdAt,
      messageCount: count(messages.id),
    })
    .from(conversations)
    .leftJoin(messages, eq(messages.conversationId, conversations.id))
    .groupBy(conversations.id)
    .orderBy(desc(conversations.createdAt))
    .limit(limit)
    .offset(offset);

  const [total] = await db.select({ count: count() }).from(conversations);

  res.json({
    conversations: rows.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
    })),
    total: total.count,
    page,
    pages: Math.ceil(Number(total.count) / limit),
  });
});

// GET /api/admin/conversations/:id/messages — full transcript
router.get("/conversations/:id/messages", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [conv] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, id));
  if (!conv) { res.status(404).json({ error: "Not found" }); return; }

  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(messages.createdAt);

  res.json({
    conversation: { ...conv, createdAt: conv.createdAt.toISOString() },
    messages: msgs.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() })),
  });
});

export default router;
