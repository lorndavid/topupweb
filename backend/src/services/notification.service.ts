import { config } from '../config';
import axios from 'axios';

/* ───────────────────────────────────────────
 *  Types
 * ─────────────────────────────────────────── */

export interface AwaitingStockAlert {
  reference: string;
  game_name: string;
  product_name: string;
  player_id: string;
  server_id?: string;
  amount: number;
  created_at: string;
}

export interface OrderFulfilledAlert {
  reference: string;
  game_name: string;
  product_name: string;
  player_id: string;
  server_id?: string;
  amount: number;
  completed_at: string;
  was_awaiting_stock: boolean;
}

/* ───────────────────────────────────────────
 *  Service
 * ─────────────────────────────────────────── */

export class NotificationService {
  /**
   * Send a test notification to verify Telegram + Webhook config.
   * Unlike other methods, this returns detailed results so the caller
   * can show exactly what worked and what didn't.
   */
  async sendTestNotification(): Promise<{
    telegram: { configured: boolean; sent: boolean; error?: string };
    webhook: { configured: boolean; sent: boolean; error?: string };
  }> {
    const { telegramBotToken, telegramChatId, webhookUrl } = config.notifications;

    const result = {
      telegram: { configured: false, sent: false } as { configured: boolean; sent: boolean; error?: string },
      webhook: { configured: false, sent: false } as { configured: boolean; sent: boolean; error?: string },
    };

    // ── Test Telegram ────────────────────────────────
    if (telegramBotToken && telegramChatId) {
      result.telegram.configured = true;
      try {
        await axios.post(
          `https://api.telegram.org/bot${telegramBotToken}/sendMessage`,
          {
            chat_id: telegramChatId,
            text: [
              `🔔 <b>Test Notification</b>`,
              ``,
              `Your notification system is working correctly!`,
              ``,
              `━━━━━━━━━━━━━━━━━━━━━`,
              `<b>Config Status</b>`,
              `━━━━━━━━━━━━━━━━━━━━━`,
              ``,
              `✅ Telegram: Connected`,
              webhookUrl ? `✅ Webhook: Configured` : `⏭️ Webhook: Not set`,
              `━━━━━━━━━━━━━━━━━━━━━`,
              ``,
              `🕐 ${new Date().toLocaleString()}`,
            ].join('\n'),
            parse_mode: 'HTML',
          },
          { timeout: 10000 }
        );
        result.telegram.sent = true;
      } catch (err: any) {
        result.telegram.sent = false;
        result.telegram.error =
          err?.response?.data?.description || err.message || 'Unknown error';
      }
    }

    // ── Test Webhook ─────────────────────────────────
    if (webhookUrl) {
      result.webhook.configured = true;
      try {
        await axios.post(
          webhookUrl,
          {
            event: 'test',
            timestamp: new Date().toISOString(),
            shop_name: config.merchant.name,
            message: 'This is a test notification from your top-up system.',
            data: {
              reference: 'TEST-0000-0000',
              game_name: 'Test Game',
              product_name: 'Test Package',
              player_id: '1234567890',
              amount: 1.00,
            },
          },
          {
            timeout: 10000,
            headers: { 'Content-Type': 'application/json' },
          }
        );
        result.webhook.sent = true;
      } catch (err: any) {
        result.webhook.sent = false;
        result.webhook.error =
          err?.response?.data?.message || err.message || 'Unknown error';
      }
    }

    return result;
  }

  /**
   * Send alerts when an order enters awaiting_stock.
   */
  async alertAwaitingStock(order: AwaitingStockAlert): Promise<void> {
    await Promise.allSettled([
      this.sendTelegramAwaitingStock(order),
      this.sendWebhook('order.awaiting_stock', order),
    ]);
  }

  /**
   * Send alerts when an order is fulfilled (completed).
   * If the order was previously awaiting_stock, this lets you know
   * the stock problem has been resolved.
   */
  async alertOrderFulfilled(order: OrderFulfilledAlert): Promise<void> {
    await Promise.allSettled([
      this.sendTelegramFulfilled(order),
      this.sendWebhook('order.fulfilled', order),
    ]);
  }

  /**
   * Send a Telegram notification via the Bot API.
   */
  private async sendTelegram(
    message: string,
    replyMarkup?: object
  ): Promise<void> {
    const { telegramBotToken, telegramChatId } = config.notifications;
    if (!telegramBotToken || !telegramChatId) return;

    try {
      await axios.post(
        `https://api.telegram.org/bot${telegramBotToken}/sendMessage`,
        {
          chat_id: telegramChatId,
          text: message,
          parse_mode: 'HTML',
          ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
        },
        { timeout: 10000 }
      );
    } catch (err: any) {
      console.warn(
        `⚠️  Telegram notification failed: ${
          err?.response?.data?.description || err.message || 'Unknown error'
        }`
      );
    }
  }

  /**
   * POST an event to the configured webhook URL.
   */
  private async sendWebhook(
    event: string,
    data: Record<string, any>
  ): Promise<void> {
    const { webhookUrl } = config.notifications;
    if (!webhookUrl) return;

    try {
      await axios.post(
        webhookUrl,
        {
          event,
          timestamp: new Date().toISOString(),
          shop_name: config.merchant.name,
          data,
          links: {
            admin_dashboard: `${config.frontendUrl}/admin`,
            order_detail: `${config.frontendUrl}/order/${(data as any).reference}`,
          },
        },
        {
          timeout: 10000,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } catch (err: any) {
      console.warn(
        `⚠️  Webhook notification failed: ${
          err?.response?.data?.message || err.message || 'Unknown error'
        }`
      );
    }
  }

  /**
   * Send the "awaiting stock" Telegram alert.
   */
  private async sendTelegramAwaitingStock(
    order: AwaitingStockAlert
  ): Promise<void> {
    const lines = [
      `🚨 <b>STOCK RUNNING OUT!</b>`,
      ``,
      `An order is waiting for stock because your Bay2Game balance is insufficient.`,
      ``,
      `━━━━━━━━━━━━━━━━━━━`,
      `<b>📦 Order Details</b>`,
      `━━━━━━━━━━━━━━━━━━━`,
      ``,
      `<b>Reference:</b> <code>${order.reference}</code>`,
      `<b>Game:</b> ${order.game_name}`,
      `<b>Package:</b> ${order.product_name}`,
      `<b>Player ID:</b> <code>${order.player_id}</code>`,
      order.server_id ? `<b>Server:</b> <code>${order.server_id}</code>` : '',
      `<b>Amount:</b> $${order.amount.toFixed(2)}`,
      `<b>Time:</b> ${new Date(order.created_at).toLocaleString()}`,
      ``,
      `━━━━━━━━━━━━━━━━━━━`,
      ``,
      `💡 <b>What to do:</b>`,
      `1. Add balance to your Bay2Game wallet via @Bay2GameBot`,
      `2. The system will auto-deliver — or click the button below to retry now`,
      ``,
      `⏳ <i>Auto-retry every ~60 seconds with exponential backoff</i>`,
    ];

    await this.sendTelegram(lines.filter(Boolean).join('\n'), {
      inline_keyboard: [
        [
          {
            text: '📋 Open Admin Dashboard',
            url: `${config.frontendUrl}/admin`,
          },
        ],
      ],
    });
  }

  /**
   * Send the "order fulfilled" Telegram alert.
   * Only sends if the order was previously awaiting stock.
   */
  private async sendTelegramFulfilled(
    order: OrderFulfilledAlert
  ): Promise<void> {
    // Only notify for orders that were awaiting stock
    if (!order.was_awaiting_stock) return;

    const lines = [
      `✅ <b>STOCK DELIVERED!</b>`,
      ``,
      `An order that was waiting for stock has been fulfilled!`,
      ``,
      `━━━━━━━━━━━━━━━━━━━`,
      `<b>📦 Delivered Order</b>`,
      `━━━━━━━━━━━━━━━━━━━`,
      ``,
      `<b>Reference:</b> <code>${order.reference}</code>`,
      `<b>Game:</b> ${order.game_name}`,
      `<b>Package:</b> ${order.product_name}`,
      `<b>Player ID:</b> <code>${order.player_id}</code>`,
      order.server_id ? `<b>Server:</b> <code>${order.server_id}</code>` : '',
      `<b>Amount:</b> $${order.amount.toFixed(2)}`,
      `<b>Completed:</b> ${new Date(order.completed_at).toLocaleString()}`,
      ``,
      `━━━━━━━━━━━━━━━━━━━`,
      ``,
      `✅ Your Bay2Game balance had enough stock to deliver this order.`,
      `No action needed.`,
    ];

    await this.sendTelegram(lines.filter(Boolean).join('\n'));
  }
}

export const notificationService = new NotificationService();
