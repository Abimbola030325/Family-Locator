import { Router, type IRouter } from "express";
import { eq, or, desc, and, ne, gte } from "drizzle-orm";
import {
  db, sosAlertsTable, circleMembersTable, locationsTable,
  pushSubscriptionsTable, activityEventsTable, usersTable,
} from "@workspace/db";
import { sendPushNotification } from "../lib/webpush";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.post("/sos", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }

  const userId    = req.user.id;
  const firstName = req.user.firstName ?? "Your person";

  // Get user's latest location
  const [lastLoc] = await db.select()
    .from(locationsTable)
    .where(eq(locationsTable.userId, userId))
    .orderBy(desc(locationsTable.timestamp))
    .limit(1);

  const latitude  = lastLoc?.latitude  ?? null;
  const longitude = lastLoc?.longitude ?? null;

  // Record the SOS alert
  await db.insert(sosAlertsTable).values({ userId, latitude, longitude, message: "Help me o!" });

  // Find all circles the user is in
  const myMemberships = await db.select({ circleId: circleMembersTable.circleId })
    .from(circleMembersTable)
    .where(eq(circleMembersTable.userId, userId));

  if (!myMemberships.length) {
    res.json({ ok: true, notified: 0 });
    return;
  }

  const circleIds = myMemberships.map(m => m.circleId);

  // Get all other members across those circles — use or(...eq) to avoid inArray pg bug
  const otherMembers = await db.select({ userId: circleMembersTable.userId })
    .from(circleMembersTable)
    .where(and(
      or(...circleIds.map(id => eq(circleMembersTable.circleId, id))),
      ne(circleMembersTable.userId, userId)
    ));

  const uniqueUserIds = [...new Set(otherMembers.map(m => m.userId))];

  // Create activity events in each circle
  await Promise.all(circleIds.map(circleId =>
    db.insert(activityEventsTable).values({
      circleId,
      userId,
      type:        "sos",
      description: latitude != null
        ? `sent SOS from (${latitude.toFixed(4)}, ${longitude!.toFixed(4)})`
        : "sent SOS alert",
    }).catch(() => {})
  ));

  if (!uniqueUserIds.length) {
    res.json({ ok: true, notified: 0 });
    return;
  }

  // Build location text
  const locationText = latitude != null
    ? `📍 ${latitude.toFixed(4)}°N, ${longitude!.toFixed(4)}°E`
    : "Location unknown";

  // Fetch push subscriptions — use or(...eq) to avoid inArray pg bug
  const subs = await db.select()
    .from(pushSubscriptionsTable)
    .where(or(...uniqueUserIds.map(id => eq(pushSubscriptionsTable.userId, id))));

  // Send push notifications
  let notified = 0;
  const expired: number[] = [];

  await Promise.all(subs.map(async sub => {
    try {
      await sendPushNotification(sub.endpoint, sub.p256dh, sub.auth, {
        title: `🆘 SOS — ${firstName} needs help!`,
        body:  `Help me o! ${firstName} dey need urgent help!\n${locationText}`,
        icon:  "/icon-192.png",
        tag:   `sos-${userId}`,
      });
      notified++;
    } catch (err: any) {
      if (err?.expired) expired.push(sub.id);
      else logger.warn({ err }, "SOS push failed");
    }
  }));

  // Clean up expired subscriptions
  if (expired.length) {
    await db.delete(pushSubscriptionsTable)
      .where(or(...expired.map(id => eq(pushSubscriptionsTable.id, id))))
      .catch(() => {});
  }

  res.json({ ok: true, notified });
});

router.get("/sos/active", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }

  const userId = req.user.id;

  // Find all circles the current user is in
  const myMemberships = await db.select({ circleId: circleMembersTable.circleId })
    .from(circleMembersTable)
    .where(eq(circleMembersTable.userId, userId));

  if (!myMemberships.length) {
    res.json([]);
    return;
  }

  const circleIds = myMemberships.map(m => m.circleId);

  // Get other members in those circles (excluding self)
  const otherMembers = await db.select({ userId: circleMembersTable.userId })
    .from(circleMembersTable)
    .where(and(
      or(...circleIds.map(id => eq(circleMembersTable.circleId, id))),
      ne(circleMembersTable.userId, userId)
    ));

  if (!otherMembers.length) {
    res.json([]);
    return;
  }

  const uniqueUserIds = [...new Set(otherMembers.map(m => m.userId))];

  // Look up SOS alerts from those members in the last 30 minutes
  const since = new Date(Date.now() - 30 * 60 * 1000);

  const alerts = await db.select({
    id:        sosAlertsTable.id,
    userId:    sosAlertsTable.userId,
    latitude:  sosAlertsTable.latitude,
    longitude: sosAlertsTable.longitude,
    message:   sosAlertsTable.message,
    sentAt:    sosAlertsTable.sentAt,
    firstName: usersTable.firstName,
    lastName:  usersTable.lastName,
    profileImageUrl: usersTable.profileImageUrl,
    email:     usersTable.email,
  })
    .from(sosAlertsTable)
    .innerJoin(usersTable, eq(sosAlertsTable.userId, usersTable.id))
    .where(and(
      or(...uniqueUserIds.map(id => eq(sosAlertsTable.userId, id))),
      gte(sosAlertsTable.sentAt, since)
    ))
    .orderBy(desc(sosAlertsTable.sentAt));

  // Fetch the latest location address for each unique user
  const uniqueAlertUserIds = [...new Set(alerts.map(a => a.userId))];
  const latestAddresses: Record<string, string | null> = {};
  await Promise.all(uniqueAlertUserIds.map(async uid => {
    const [loc] = await db.select({ address: locationsTable.address })
      .from(locationsTable)
      .where(eq(locationsTable.userId, uid))
      .orderBy(desc(locationsTable.timestamp))
      .limit(1);
    latestAddresses[uid] = loc?.address ?? null;
  }));

  const result = alerts.map(a => ({
    id:        a.id,
    userId:    a.userId,
    latitude:  a.latitude ?? null,
    longitude: a.longitude ?? null,
    address:   latestAddresses[a.userId] ?? null,
    message:   a.message,
    sentAt:    a.sentAt.toISOString(),
    user: {
      id:              a.userId,
      firstName:       a.firstName ?? null,
      lastName:        a.lastName ?? null,
      profileImageUrl: a.profileImageUrl ?? null,
      email:           a.email ?? null,
    },
  }));

  res.json(result);
});

export default router;
