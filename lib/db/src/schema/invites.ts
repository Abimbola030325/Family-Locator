import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { circlesTable } from "./circles";

export const circleInvitesTable = pgTable("circle_invites", {
  id:        serial("id").primaryKey(),
  token:     text("token").notNull().unique(),
  circleId:  integer("circle_id").notNull().references(() => circlesTable.id, { onDelete: "cascade" }),
  createdBy: text("created_by").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type CircleInvite = typeof circleInvitesTable.$inferSelect;
