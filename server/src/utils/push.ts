import webpush from 'web-push';

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:admin@pearl.app',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export async function sendPush(
  subscription: webpush.PushSubscription,
  title: string,
  body: string
) {
  if (!process.env.VAPID_PUBLIC_KEY) return;
  try {
    await webpush.sendNotification(subscription, JSON.stringify({ title, body }));
  } catch {
    // Subscription expired or invalid — ignore silently
  }
}

export const vapidPublicKey = process.env.VAPID_PUBLIC_KEY ?? '';
