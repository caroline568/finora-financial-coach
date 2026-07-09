import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { users } from "./users";

export const aiMemory = pgTable("ai_memory", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  memoryType: text("memory_type").notNull(), // commitment | achievement | challenge | insight | goal-update | behavioral-pattern
  content: text("content").notNull(),
  metadata: text("metadata"), // JSON with extra context
  conversationId: integer("conversation_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertAiMemorySchema = createInsertSchema(aiMemory).omit({
  id: true,
  createdAt: true,
});

export type AiMemory = typeof aiMemory.$inferSelect;
export type InsertAiMemory = z.infer<typeof insertAiMemorySchema>;
