import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { circlesTable } from "./circles";
import { usersTable } from "./auth";

export const circleMessagesTable = pgTable("circle_messages", {
  id:        serial("id").primaryKey(),
  circleId:  integer("circle_id").notNull().references(() => circlesTable.id, { onDelete: "cascade" }),
  userId:    text("user_id").notNull().references(() => usersTable.id),
  content:   text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type CircleMessageRow = typeof circleMessagesTable.$inferSelect;
