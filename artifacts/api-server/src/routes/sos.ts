import { Router, type IRouter } from "express";
import { eq, or, desc, and, ne } from "drizzle-orm";
import {
  db, sosAlertsTable, circleMembersTable, locationsTable,
  pushSubscriptionsTable, activityEventsTable,
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

export default router;
