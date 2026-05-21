import webpush from "web-push";
import { logger } from "./logger";

const publicKey = process.env.VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const email = process.env.VAPID_EMAIL || "mailto:admin@whereyoudey.app";

if (!publicKey || !privateKey) {
  logger.warn("VAPID keys not configured — push notifications disabled");
} else {
  webpush.setVapidDetails(email, publicKey, privateKey);
}

export const vapidPublicKey = publicKey ?? null;

export async function sendPushNotification(
  endpoint: string,
  p256dh: string,
  auth: string,
  payload: { title: string; body: string; icon?: string; tag?: string }
): Promise<void> {
  if (!publicKey || !privateKey) return;
  try {
    await webpush.sendNotification(
      { endpoint, keys: { p256dh, auth } },
      JSON.stringify(payload)
    );
  } catch (err: any) {
    // 410 Gone = subscription expired, caller should delete it
    if (err?.statusCode === 410) {
      throw Object.assign(err, { expired: true });
    }
    logger.warn({ err }, "Push notification send failed");
  }
}
