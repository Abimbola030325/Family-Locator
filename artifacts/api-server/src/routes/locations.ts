import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, locationsTable, activityEventsTable } from "@workspace/db";
import {
  UpdateMyLocationBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.put("/locations/me", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }

  const parsed = UpdateMyLocationBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [loc] = await db.insert(locationsTable).values({
    userId: req.user.id,
    latitude: parsed.data.latitude,
    longitude: parsed.data.longitude,
    accuracy: parsed.data.accuracy ?? null,
    address: parsed.data.address ?? null,
    speed: parsed.data.speed ?? null,
    batteryLevel: parsed.data.batteryLevel ?? null,
  }).returning();

  res.json({
    id: loc.id, userId: loc.userId, latitude: loc.latitude, longitude: loc.longitude,
    accuracy: loc.accuracy ?? null, address: loc.address ?? null,
    speed: loc.speed ?? null, batteryLevel: loc.batteryLevel ?? null,
    timestamp: loc.timestamp.toISOString(),
  });
});

router.get("/locations/history", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }

  const history = await db.select().from(locationsTable)
    .where(eq(locationsTable.userId, req.user.id))
    .orderBy(sql`timestamp DESC`)
    .limit(20);

  res.json(history.map(loc => ({
    id: loc.id, userId: loc.userId, latitude: loc.latitude, longitude: loc.longitude,
    accuracy: loc.accuracy ?? null, address: loc.address ?? null,
    speed: loc.speed ?? null, batteryLevel: loc.batteryLevel ?? null,
    timestamp: loc.timestamp.toISOString(),
  })));
});

router.get("/circles/:circleId/locations", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }

  const circleId = parseInt(String(Array.isArray(req.params.circleId) ? req.params.circleId[0] : req.params.circleId), 10);

  const { circleMembersTable, usersTable } = await import("@workspace/db");

  const members = await db.select().from(circleMembersTable).where(eq(circleMembersTable.circleId, circleId));

  const result = await Promise.all(members.map(async (m) => {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, m.userId));
    const [loc] = await db.select().from(locationsTable)
      .where(eq(locationsTable.userId, m.userId))
      .orderBy(sql`timestamp DESC`)
      .limit(1);

    return {
      userId: m.userId,
      user: user ? {
        id: user.id, email: user.email ?? null, firstName: user.firstName ?? null,
        lastName: user.lastName ?? null, profileImageUrl: user.profileImageUrl ?? null,
      } : { id: m.userId, email: null, firstName: null, lastName: null, profileImageUrl: null },
      location: loc ? {
        id: loc.id, userId: loc.userId, latitude: loc.latitude, longitude: loc.longitude,
        accuracy: loc.accuracy ?? null, address: loc.address ?? null,
        speed: loc.speed ?? null, batteryLevel: loc.batteryLevel ?? null,
        timestamp: loc.timestamp.toISOString(),
      } : null,
    };
  }));

  res.json(result);
});

export default router;
