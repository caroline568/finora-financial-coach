import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  occupation: text("occupation"), // conductor | mama-mboga | boda-rider | student | biashara | office-worker | casual-worker | other
  incomeType: text("income_type"), // salary | daily | irregular | business
  incomeRange: text("income_range"), // under-10k | 10k-25k | 25k-50k | 50k-100k | over-100k
  payFrequency: text("pay_frequency"), // daily | weekly | fortnightly | monthly
  dependants: integer("dependants").default(0),
  financialPersonality: text("financial_personality"), // saver | planner | impulse | risk-taker | provider | debt-dependent
  financialChallenges: text("financial_challenges"), // JSON string[]
  authProvider: text("auth_provider").default("email"), // email | google
  googleId: text("google_id"),
  avatarUrl: text("avatar_url"),
  healthScore: integer("health_score").default(50),
  onboardingComplete: integer("onboarding_complete").default(0), // 0 | 1
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  healthScore: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
