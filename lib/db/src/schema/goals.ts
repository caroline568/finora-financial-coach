import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { users } from "./users";

export const goals = pgTable("goals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  emoji: text("emoji").default("🎯"),
  category: text("category"), // rent | emergency-fund | school-fees | business | electronics | land | car | holiday | other
  targetAmount: integer("target_amount").notNull(), // KES
  currentAmount: integer("current_amount").default(0), // KES
  deadline: timestamp("deadline", { withTimezone: true }),
  status: text("status").default("active"), // active | completed | paused
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertGoalSchema = createInsertSchema(goals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Goal = typeof goals.$inferSelect;
export type InsertGoal = z.infer<typeof insertGoalSchema>;
