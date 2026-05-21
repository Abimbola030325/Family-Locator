import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { circlesTable } from "./circles";

export const activityEventsTable = pgTable("activity_events", {
  id: serial("id").primaryKey(),
  circleId: integer("circle_id").notNull().references(() => circlesTable.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  type: text("type").notNull(),
  description: text("description").notNull(),
  placeId: integer("place_id"),
  placeName: text("place_name"),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
});

export const insertActivityEventSchema = createInsertSchema(activityEventsTable).omit({ id: true, timestamp: true });
export type InsertActivityEvent = z.infer<typeof insertActivityEventSchema>;
export type ActivityEvent = typeof activityEventsTable.$inferSelect;
