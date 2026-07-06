import { boolean, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  phone: text("phone").notNull(),
  amount: integer("amount").notNull(),
  duration: text("duration").notNull(), // 'daily' | 'weekly' | 'monthly'
  checkoutRequestId: text("checkout_request_id").unique(),
  merchantRequestId: text("merchant_request_id"),
  status: text("status").notNull().default("pending"), // 'pending' | 'completed' | 'failed' | 'cancelled'
  resultCode: text("result_code"),
  resultDesc: text("result_desc"),
  mpesaReceipt: text("mpesa_receipt"),
  used: boolean("used").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Payment = typeof payments.$inferSelect;
