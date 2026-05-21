import { Router, type IRouter } from "express";
import { eq, and, gt } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db, circleInvitesTable, circleMembersTable, circlesTable, usersTable, activityEventsTable } from "@workspace/db";

const router: IRouter = Router();

// Create an invite link for a circle (owner/member only)
router.post("/circles/:circleId/invite-link", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }

  const circleId = parseInt(req.params.circleId, 10);
  if (isNaN(circleId)) { res.status(400).json({ error: "Invalid circle id" }); return; }

  // Verify caller is a member
  const [membership] = await db.select().from(circleMembersTable)
    .where(and(eq(circleMembersTable.circleId, circleId), eq(circleMembersTable.userId, req.user.id)));
  if (!membership) { res.status(403).json({ error: "Not a member of this circle" }); return; }

  const [circle] = await db.select().from(circlesTable).where(eq(circlesTable.id, circleId));
  if (!circle) { res.status(404).json({ error: "Circle not found" }); return; }

  const token     = randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await db.insert(circleInvitesTable).values({ token, circleId, createdBy: req.user.id, expiresAt });

  res.json({ token, expiresAt: expiresAt.toISOString() });
});

// Get invite info — PUBLIC (no auth required)
router.get("/invite/:token", async (req, res): Promise<void> => {
  const { token } = req.params;
  const now = new Date();

  const [invite] = await db.select().from(circleInvitesTable)
    .where(and(eq(circleInvitesTable.token, token), gt(circleInvitesTable.expiresAt, now)));

  if (!invite) { res.status(404).json({ error: "Invite link is invalid or has expired" }); return; }

  const [circle]  = await db.select().from(circlesTable).where(eq(circlesTable.id, invite.circleId));
  const [creator] = await db.select().from(usersTable).where(eq(usersTable.id, invite.createdBy));

  res.json({
    valid:          true,
    circleId:       invite.circleId,
    circleName:     circle?.name ?? "Unknown Circle",
    circleColor:    circle?.color ?? "#14b8a6",
    createdByName:  creator?.firstName ?? "Someone",
    expiresAt:      invite.expiresAt.toISOString(),
  });
});

// Accept an invite — authenticated
router.post("/invite/:token/join", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { token } = req.params;
  const now = new Date();

  const [invite] = await db.select().from(circleInvitesTable)
    .where(and(eq(circleInvitesTable.token, token), gt(circleInvitesTable.expiresAt, now)));

  if (!invite) { res.status(404).json({ error: "Invite link is invalid or has expired" }); return; }

  // Check if already a member
  const [existing] = await db.select().from(circleMembersTable)
    .where(and(eq(circleMembersTable.circleId, invite.circleId), eq(circleMembersTable.userId, req.user.id)));

  if (existing) {
    res.json({ ok: true, circleId: invite.circleId, alreadyMember: true });
    return;
  }

  await db.insert(circleMembersTable).values({
    circleId: invite.circleId,
    userId:   req.user.id,
    role:     "member",
  });

  // Log activity
  await db.insert(activityEventsTable).values({
    circleId:    invite.circleId,
    userId:      req.user.id,
    type:        "member_joined",
    description: "joined via invite link",
  }).catch(() => {});

  res.json({ ok: true, circleId: invite.circleId, alreadyMember: false });
});

export default router;
