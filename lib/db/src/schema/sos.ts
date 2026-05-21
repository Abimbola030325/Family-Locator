import { pgTable, serial, text, timestamp, real } from "drizzle-orm/pg-core";
import { usersTable } from "./auth";

export const sosAlertsTable = pgTable("sos_alerts", {
  id:        serial("id").primaryKey(),
  userId:    text("user_id").notNull().references(() => usersTable.id),
  latitude:  real("latitude"),
  longitude: real("longitude"),
  message:   text("message").notNull().default("Help me o!"),
  sentAt:    timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SosAlert = typeof sosAlertsTable.$inferSelect;
