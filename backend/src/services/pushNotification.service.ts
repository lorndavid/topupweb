import { config } from '../config';
import webpush from 'web-push';

// In-memory subscription store (resets on restart)
// For production, store these in MongoDB so subscriptions persist
interface PushSubscription {
  endpoint: string;
  keys: {
    auth: string;
    p256dh: string;
  };
  userAgent?: string;
  createdAt: Date;
}

const subscriptions: Map<string, PushSubscription> = new Map();

export class PushNotificationService {
  constructor() {
    if (config.push.publicKey && config.push.privateKey) {
      webpush.setVapidDetails(
        config.push.subject,
        config.push.publicKey,
        config.push.privateKey
      );
      console.log('🔔 Push notifications configured');
    } else {
      console.warn('⚠️  Push notifications not configured — set VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY in .env');
      console.log('   Generate keys: npx web-push generate-vapid-keys');
    }
  }

  /** Subscribe a new device/browser to push notifications */
  subscribe(subscription: PushSubscription): { success: boolean; message: string } {
    const key = subscription.endpoint;
    subscriptions.set(key, {
      ...subscription,
      createdAt: new Date(),
    });
    return { success: true, message: 'Subscribed successfully' };
  }

  /** Unsubscribe a device/browser */
  unsubscribe(endpoint: string): { success: boolean; message: string } {
    const deleted = subscriptions.delete(endpoint);
    return {
      success: deleted,
      message: deleted ? 'Unsubscribed successfully' : 'Subscription not found',
    };
  }

  /** Send a push notification to all subscribed devices */
  async notifyAll(payload: {
    title: string;
    body: string;
    url?: string;
    reference?: string;
    tag?: string;
  }): Promise<{ sent: number; failed: number }> {
    if (!config.push.publicKey || !config.push.privateKey) {
      return { sent: 0, failed: 0 };
    }

    let sent = 0;
    let failed = 0;

    const message = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url || config.frontendUrl,
      reference: payload.reference || '',
      tag: payload.tag || 'default',
      icon: '/pwa-icon-192x192.png',
      badge: '/pwa-icon-192x192.png',
      vibrate: [200, 100, 200],
    });

    const deadEndpoints: string[] = [];

    await Promise.allSettled(
      Array.from(subscriptions.entries()).map(async ([endpoint, sub]) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: sub.keys,
            },
            message
          );
          sent++;
        } catch (err: any) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            // Subscription expired or unsubscribed — remove it
            deadEndpoints.push(endpoint);
          }
          failed++;
        }
      })
    );

    // Clean up dead subscriptions
    for (const ep of deadEndpoints) {
      subscriptions.delete(ep);
    }

    return { sent, failed };
  }

  /** Send a payment confirmation push notification */
  async notifyPaymentConfirmed(reference: string, gameName: string, playerId: string): Promise<void> {
    await this.notifyAll({
      title: '✅ Payment Confirmed!',
      body: `Your ${gameName} top-up for ${playerId} is being processed.`,
      url: `${config.frontendUrl}/order/${reference}`,
      reference,
      tag: `payment-${reference}`,
    });
  }

  /** Send an order completed push notification */
  async notifyOrderCompleted(reference: string, gameName: string, playerId: string): Promise<void> {
    await this.notifyAll({
      title: '🎮 Top-Up Delivered!',
      body: `Your ${gameName} diamonds for ${playerId} have been delivered successfully!`,
      url: `${config.frontendUrl}/order/${reference}`,
      reference,
      tag: `order-${reference}`,
    });
  }

  /** Get subscription count */
  getStats(): { total: number } {
    return { total: subscriptions.size };
  }
}

export const pushNotificationService = new PushNotificationService();
