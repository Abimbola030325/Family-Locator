import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const circlesTable = pgTable("circles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color").notNull().default("#0ea5e9"),
  ownerId: text("owner_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCircleSchema = createInsertSchema(circlesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCircle = z.infer<typeof insertCircleSchema>;
export type Circle = typeof circlesTable.$inferSelect;

export const circleMembersTable = pgTable("circle_members", {
  id: serial("id").primaryKey(),
  circleId: integer("circle_id").notNull().references(() => circlesTable.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  role: text("role").notNull().default("member"),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCircleMemberSchema = createInsertSchema(circleMembersTable).omit({ id: true, joinedAt: true });
export type InsertCircleMember = z.infer<typeof insertCircleMemberSchema>;
export type CircleMember = typeof circleMembersTable.$inferSelect;
