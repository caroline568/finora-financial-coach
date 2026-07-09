import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { users } from "./users";

export const habitStreaks = pgTable("habit_streaks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  habitType: text("habit_type").notNull(), // daily-tracking | savings | budget-check | coaching-session
  currentStreak: integer("current_streak").default(0),
  longestStreak: integer("longest_streak").default(0),
  totalCheckIns: integer("total_check_ins").default(0),
  lastCheckIn: timestamp("last_check_in", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertHabitStreakSchema = createInsertSchema(habitStreaks).omit({
  id: true,
  updatedAt: true,
});

export type HabitStreak = typeof habitStreaks.$inferSelect;
export type InsertHabitStreak = z.infer<typeof insertHabitStreakSchema>;
