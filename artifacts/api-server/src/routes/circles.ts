import { Router, type IRouter } from "express";
import { eq, and, count, sql } from "drizzle-orm";
import { db, circlesTable, circleMembersTable, placesTable, activityEventsTable, usersTable, locationsTable } from "@workspace/db";
import {
  CreateCircleBody,
  GetCircleParams,
  UpdateCircleParams,
  UpdateCircleBody,
  DeleteCircleParams,
  GetCircleSummaryParams,
  ListCircleMembersParams,
  InviteMemberParams,
  InviteMemberBody,
  RemoveCircleMemberParams,
  ListPlacesParams,
  CreatePlaceParams,
  CreatePlaceBody,
  UpdatePlaceParams,
  UpdatePlaceBody,
  DeletePlaceParams,
  GetCircleActivityParams,
  CheckInParams,
  CheckInBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

function parseId(val: unknown): number {
  const raw = Array.isArray(val) ? val[0] : val;
  return parseInt(String(raw), 10);
}

async function getUserById(userId: string) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) return { id: userId, email: null, firstName: null, lastName: null, profileImageUrl: null };
  return { id: user.id, email: user.email ?? null, firstName: user.firstName ?? null, lastName: user.lastName ?? null, profileImageUrl: user.profileImageUrl ?? null };
}

// ── Circles ──────────────────────────────────────────────────────────────

router.get("/circles", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const memberships = await db
    .select({ circleId: circleMembersTable.circleId })
    .from(circleMembersTable)
    .where(eq(circleMembersTable.userId, req.user.id));

  if (memberships.length === 0) { res.json([]); return; }

  const circleIds = memberships.map(m => m.circleId);
  const circles = await db.select().from(circlesTable).where(sql`${circlesTable.id} = ANY(${circleIds})`);

  const memberCounts = await db
    .select({ circleId: circleMembersTable.circleId, cnt: count() })
    .from(circleMembersTable)
    .where(sql`${circleMembersTable.circleId} = ANY(${circleIds})`)
    .groupBy(circleMembersTable.circleId);

  const countMap = Object.fromEntries(memberCounts.map(r => [r.circleId, Number(r.cnt)]));

  res.json(circles.map(c => ({
    id: c.id,
    name: c.name,
    description: c.description ?? null,
    color: c.color,
    ownerId: c.ownerId,
    memberCount: countMap[c.id] ?? 0,
    createdAt: c.createdAt.toISOString(),
  })));
});

router.post("/circles", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }

  const parsed = CreateCircleBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [circle] = await db.insert(circlesTable).values({
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    color: parsed.data.color ?? "#0ea5e9",
    ownerId: req.user.id,
  }).returning();

  await db.insert(circleMembersTable).values({ circleId: circle.id, userId: req.user.id, role: "owner" });

  res.status(201).json({
    id: circle.id, name: circle.name, description: circle.description ?? null,
    color: circle.color, ownerId: circle.ownerId, memberCount: 1,
    createdAt: circle.createdAt.toISOString(),
  });
});

router.get("/circles/:circleId", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }

  const params = GetCircleParams.safeParse({ circleId: parseId(req.params.circleId) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [circle] = await db.select().from(circlesTable).where(eq(circlesTable.id, params.data.circleId));
  if (!circle) { res.status(404).json({ error: "Circle not found" }); return; }

  const [membership] = await db.select().from(circleMembersTable)
    .where(and(eq(circleMembersTable.circleId, params.data.circleId), eq(circleMembersTable.userId, req.user.id)));
  if (!membership) { res.status(403).json({ error: "Not a member" }); return; }

  const [{ cnt }] = await db.select({ cnt: count() }).from(circleMembersTable).where(eq(circleMembersTable.circleId, params.data.circleId));

  res.json({
    id: circle.id, name: circle.name, description: circle.description ?? null,
    color: circle.color, ownerId: circle.ownerId, memberCount: Number(cnt),
    createdAt: circle.createdAt.toISOString(),
  });
});

router.patch("/circles/:circleId", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }

  const params = UpdateCircleParams.safeParse({ circleId: parseId(req.params.circleId) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const parsed = UpdateCircleBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [circle] = await db.select().from(circlesTable).where(eq(circlesTable.id, params.data.circleId));
  if (!circle) { res.status(404).json({ error: "Not found" }); return; }
  if (circle.ownerId !== req.user.id) { res.status(403).json({ error: "Forbidden" }); return; }

  const updates: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.description !== undefined) updates.description = parsed.data.description;
  if (parsed.data.color !== undefined) updates.color = parsed.data.color;

  const [updated] = await db.update(circlesTable).set(updates).where(eq(circlesTable.id, params.data.circleId)).returning();
  const [{ cnt }] = await db.select({ cnt: count() }).from(circleMembersTable).where(eq(circleMembersTable.circleId, params.data.circleId));

  res.json({
    id: updated.id, name: updated.name, description: updated.description ?? null,
    color: updated.color, ownerId: updated.ownerId, memberCount: Number(cnt),
    createdAt: updated.createdAt.toISOString(),
  });
});

router.delete("/circles/:circleId", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }

  const params = DeleteCircleParams.safeParse({ circleId: parseId(req.params.circleId) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [circle] = await db.select().from(circlesTable).where(eq(circlesTable.id, params.data.circleId));
  if (!circle) { res.status(404).json({ error: "Not found" }); return; }
  if (circle.ownerId !== req.user.id) { res.status(403).json({ error: "Forbidden" }); return; }

  await db.delete(circlesTable).where(eq(circlesTable.id, params.data.circleId));
  res.sendStatus(204);
});

router.get("/circles/:circleId/summary", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }

  const params = GetCircleSummaryParams.safeParse({ circleId: parseId(req.params.circleId) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [memberCnt] = await db.select({ cnt: count() }).from(circleMembersTable).where(eq(circleMembersTable.circleId, params.data.circleId));
  const [placeCnt] = await db.select({ cnt: count() }).from(placesTable).where(eq(placesTable.circleId, params.data.circleId));

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [eventCnt] = await db.select({ cnt: count() }).from(activityEventsTable)
    .where(and(eq(activityEventsTable.circleId, params.data.circleId), sql`${activityEventsTable.timestamp} > ${oneDayAgo}`));

  res.json({
    circleId: params.data.circleId,
    memberCount: Number(memberCnt.cnt),
    placeCount: Number(placeCnt.cnt),
    recentEventCount: Number(eventCnt.cnt),
    onlineCount: Number(memberCnt.cnt),
  });
});

// ── Members ──────────────────────────────────────────────────────────────

router.get("/circles/:circleId/members", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }

  const params = ListCircleMembersParams.safeParse({ circleId: parseId(req.params.circleId) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const members = await db.select().from(circleMembersTable).where(eq(circleMembersTable.circleId, params.data.circleId));

  const result = await Promise.all(members.map(async (m) => {
    const user = await getUserById(m.userId);
    const [loc] = await db.select().from(locationsTable as any).where(eq((locationsTable as any).userId, m.userId)).orderBy(sql`timestamp DESC`).limit(1);
    return {
      id: m.id, userId: m.userId, circleId: m.circleId, role: m.role,
      joinedAt: m.joinedAt.toISOString(), user,
      lastLocation: loc ? {
        id: loc.id, userId: loc.userId, latitude: loc.latitude, longitude: loc.longitude,
        accuracy: loc.accuracy ?? null, address: loc.address ?? null, speed: loc.speed ?? null,
        batteryLevel: loc.batteryLevel ?? null, timestamp: loc.timestamp.toISOString(),
      } : null,
    };
  }));

  res.json(result);
});

router.post("/circles/:circleId/members/invite", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }

  const params = InviteMemberParams.safeParse({ circleId: parseId(req.params.circleId) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const parsed = InviteMemberBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [targetUser] = await db.select().from(usersTable).where(eq(usersTable.email, parsed.data.email));
  if (!targetUser) { res.status(404).json({ error: "User with that email not found" }); return; }

  const [existing] = await db.select().from(circleMembersTable)
    .where(and(eq(circleMembersTable.circleId, params.data.circleId), eq(circleMembersTable.userId, targetUser.id)));
  if (existing) { res.status(409).json({ error: "Already a member" }); return; }

  const [member] = await db.insert(circleMembersTable).values({
    circleId: params.data.circleId, userId: targetUser.id, role: "member",
  }).returning();

  await db.insert(activityEventsTable).values({
    circleId: params.data.circleId, userId: targetUser.id,
    type: "member_joined", description: `${targetUser.firstName ?? targetUser.email} joined the circle`,
  });

  const user = await getUserById(targetUser.id);
  res.status(201).json({ id: member.id, userId: member.userId, circleId: member.circleId, role: member.role, joinedAt: member.joinedAt.toISOString(), user, lastLocation: null });
});

router.delete("/circles/:circleId/members/:memberId", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }

  const params = RemoveCircleMemberParams.safeParse({
    circleId: parseId(req.params.circleId),
    memberId: parseId(req.params.memberId),
  });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  await db.delete(circleMembersTable).where(and(
    eq(circleMembersTable.id, params.data.memberId),
    eq(circleMembersTable.circleId, params.data.circleId),
  ));
  res.sendStatus(204);
});

// ── Places ────────────────────────────────────────────────────────────────

router.get("/circles/:circleId/places", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }

  const params = ListPlacesParams.safeParse({ circleId: parseId(req.params.circleId) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const places = await db.select().from(placesTable).where(eq(placesTable.circleId, params.data.circleId));

  res.json(places.map(p => ({
    id: p.id, circleId: p.circleId, name: p.name, latitude: p.latitude, longitude: p.longitude,
    radius: p.radius, icon: p.icon, createdAt: p.createdAt.toISOString(),
  })));
});

router.post("/circles/:circleId/places", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }

  const params = CreatePlaceParams.safeParse({ circleId: parseId(req.params.circleId) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const parsed = CreatePlaceBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [place] = await db.insert(placesTable).values({
    circleId: params.data.circleId,
    name: parsed.data.name,
    latitude: parsed.data.latitude,
    longitude: parsed.data.longitude,
    radius: parsed.data.radius ?? 100,
    icon: parsed.data.icon ?? "home",
  }).returning();

  res.status(201).json({
    id: place.id, circleId: place.circleId, name: place.name,
    latitude: place.latitude, longitude: place.longitude,
    radius: place.radius, icon: place.icon, createdAt: place.createdAt.toISOString(),
  });
});

router.patch("/circles/:circleId/places/:placeId", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }

  const params = UpdatePlaceParams.safeParse({
    circleId: parseId(req.params.circleId),
    placeId: parseId(req.params.placeId),
  });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const parsed = UpdatePlaceBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const updates: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.latitude !== undefined) updates.latitude = parsed.data.latitude;
  if (parsed.data.longitude !== undefined) updates.longitude = parsed.data.longitude;
  if (parsed.data.radius !== undefined) updates.radius = parsed.data.radius;
  if (parsed.data.icon !== undefined) updates.icon = parsed.data.icon;

  const [place] = await db.update(placesTable).set(updates)
    .where(and(eq(placesTable.id, params.data.placeId), eq(placesTable.circleId, params.data.circleId)))
    .returning();

  if (!place) { res.status(404).json({ error: "Place not found" }); return; }

  res.json({
    id: place.id, circleId: place.circleId, name: place.name,
    latitude: place.latitude, longitude: place.longitude,
    radius: place.radius, icon: place.icon, createdAt: place.createdAt.toISOString(),
  });
});

router.delete("/circles/:circleId/places/:placeId", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }

  const params = DeletePlaceParams.safeParse({
    circleId: parseId(req.params.circleId),
    placeId: parseId(req.params.placeId),
  });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  await db.delete(placesTable).where(and(eq(placesTable.id, params.data.placeId), eq(placesTable.circleId, params.data.circleId)));
  res.sendStatus(204);
});

// ── Activity ──────────────────────────────────────────────────────────────

router.get("/circles/:circleId/activity", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }

  const params = GetCircleActivityParams.safeParse({ circleId: parseId(req.params.circleId) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const events = await db.select().from(activityEventsTable)
    .where(eq(activityEventsTable.circleId, params.data.circleId))
    .orderBy(sql`timestamp DESC`)
    .limit(30);

  const result = await Promise.all(events.map(async (e) => {
    const user = await getUserById(e.userId);
    return {
      id: e.id, circleId: e.circleId, userId: e.userId,
      type: e.type, description: e.description,
      placeId: e.placeId ?? null, placeName: e.placeName ?? null,
      timestamp: e.timestamp.toISOString(), user,
    };
  }));

  res.json(result);
});

router.post("/circles/:circleId/checkin", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }

  const params = CheckInParams.safeParse({ circleId: parseId(req.params.circleId) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const parsed = CheckInBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [event] = await db.insert(activityEventsTable).values({
    circleId: params.data.circleId,
    userId: req.user.id,
    type: "checkin",
    description: parsed.data.description,
    placeId: parsed.data.placeId ?? null,
  }).returning();

  const user = await getUserById(req.user.id);
  res.status(201).json({
    id: event.id, circleId: event.circleId, userId: event.userId,
    type: event.type, description: event.description,
    placeId: event.placeId ?? null, placeName: event.placeName ?? null,
    timestamp: event.timestamp.toISOString(), user,
  });
});

export default router;
