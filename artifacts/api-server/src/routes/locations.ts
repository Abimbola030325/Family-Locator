import { Router, type IRouter } from "express";
import { eq, sql, inArray } from "drizzle-orm";
import { db, locationsTable, activityEventsTable, circleMembersTable, placesTable, pushSubscriptionsTable, usersTable } from "@workspace/db";
import { UpdateMyLocationBody } from "@workspace/api-zod";
import { isInsidePlace } from "../lib/geofence";
import { sendPushNotification } from "../lib/webpush";

const router: IRouter = Router();

// Track previous "inside place" state in memory per user (good enough for single-instance)
const userPlaceState = new Map<string, Set<number>>();

async function triggerGeofenceAlerts(
  userId: string,
  lat: number,
  lng: number
): Promise<void> {
  // Find all circles this user belongs to
  const memberships = await db.select().from(circleMembersTable).where(eq(circleMembersTable.userId, userId));
  if (!memberships.length) return;

  const circleIds = memberships.map(m => m.circleId);

  // Load places for those circles
  const places = await db.select().from(placesTable).where(inArray(placesTable.circleId, circleIds));
  if (!places.length) return;

  // Get user display name
  const [userRow] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  const name = userRow?.firstName || "Someone";

  const prevState = userPlaceState.get(userId) ?? new Set<number>();
  const nextState = new Set<number>();

  const arrivals: typeof places = [];
  const departures: typeof places = [];

  for (const place of places) {
    const inside = isInsidePlace(lat, lng, place.latitude, place.longitude, place.radius);
    if (inside) nextState.add(place.id);
    if (inside && !prevState.has(place.id)) arrivals.push(place);
    if (!inside && prevState.has(place.id)) departures.push(place);
  }

  userPlaceState.set(userId, nextState);

  if (!arrivals.length && !departures.length) return;

  // Collect all other circle members who should be notified
  const allOtherMemberIds = (
    await db.select().from(circleMembersTable)
      .where(inArray(circleMembersTable.circleId, circleIds))
  )
    .map(m => m.userId)
    .filter(id => id !== userId);

  const uniqueIds = [...new Set(allOtherMemberIds)];
  if (!uniqueIds.length) return;

  const subscriptions = await db.select().from(pushSubscriptionsTable)
    .where(inArray(pushSubscriptionsTable.userId, uniqueIds));

  if (!subscriptions.length) return;

  const notifications: Array<{ title: string; body: string; tag: string }> = [];

  for (const place of arrivals) {
    notifications.push({
      title: `${name} don reach 📍`,
      body: `${name} just reach ${place.name}`,
      tag: `arrive-${place.id}`,
    });
    // Log activity event
    await db.insert(activityEventsTable).values({
      circleId: place.circleId,
      userId,
      type: "arrival",
      description: `arrived at ${place.name}`,
      placeId: place.id,
    }).catch(() => {});
  }

  for (const place of departures) {
    notifications.push({
      title: `${name} don comot 🚗`,
      body: `${name} just comot from ${place.name}`,
      tag: `depart-${place.id}`,
    });
    await db.insert(activityEventsTable).values({
      circleId: place.circleId,
      userId,
      type: "departure",
      description: `left ${place.name}`,
      placeId: place.id,
    }).catch(() => {});
  }

  // Fan out push notifications, remove expired subscriptions
  const toDelete: number[] = [];
  await Promise.all(
    subscriptions.flatMap(sub =>
      notifications.map(async notif => {
        try {
          await sendPushNotification(sub.endpoint, sub.p256dh, sub.auth, { ...notif, icon: "/favicon.svg" });
        } catch (err: any) {
          if (err?.expired) toDelete.push(sub.id);
        }
      })
    )
  );

  if (toDelete.length) {
    await db.delete(pushSubscriptionsTable).where(inArray(pushSubscriptionsTable.id, toDelete));
  }
}

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

  // Geofence check runs in background — don't block the response
  triggerGeofenceAlerts(req.user.id, parsed.data.latitude, parsed.data.longitude).catch(() => {});

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
