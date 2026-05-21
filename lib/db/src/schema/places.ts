import { pgTable, text, serial, timestamp, real, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { circlesTable } from "./circles";

export const placesTable = pgTable("places", {
  id: serial("id").primaryKey(),
  circleId: integer("circle_id").notNull().references(() => circlesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  radius: real("radius").notNull().default(100),
  icon: text("icon").notNull().default("home"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPlaceSchema = createInsertSchema(placesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPlace = z.infer<typeof insertPlaceSchema>;
export type Place = typeof placesTable.$inferSelect;
