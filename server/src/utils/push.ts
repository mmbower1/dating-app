import webpush from 'web-push';

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:admin@lovelocked.app',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export async function sendPush(
  subscription: webpush.PushSubscription,
  title: string,
  body: string
): Promise<'sent' | 'expired' | 'skipped'> {
  if (!process.env.VAPID_PUBLIC_KEY) return 'skipped';
  try {
    await webpush.sendNotification(subscription, JSON.stringify({ title, body }));
    return 'sent';
  } catch (err: unknown) {
    const statusCode = (err as { statusCode?: number })?.statusCode;
    if (statusCode === 410 || statusCode === 404) return 'expired';
    return 'skipped';
  }
}

export const vapidPublicKey = process.env.VAPID_PUBLIC_KEY ?? '';
