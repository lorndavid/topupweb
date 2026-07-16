import { config } from '../config';
import axios from 'axios';
import { orderRepository } from '../repositories/OrderRepository';

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
   * Send a daily summary report to Telegram with today's revenue,
   * orders completed, profit stats, and game breakdown.
   * Returns whether the message was sent successfully.
   */
  async sendDailySummary(): Promise<boolean> {
    const { telegramBotToken, telegramChatId } = config.notifications;
    if (!telegramBotToken || !telegramChatId) {
      console.warn('⚠️  Daily summary not sent: Telegram not configured');
      return false;
    }

    try {
      const stats = await orderRepository.getDailyStats();

      // Build game breakdown lines
      const gameLines = Object.entries(stats.by_game)
        .sort((a, b) => b[1].revenue - a[1].revenue)
        .map(
          ([game, data]) =>
            `   • ${this.getGameEmoji(game)} <b>${game.toUpperCase()}</b> — ${data.count} order${data.count !== 1 ? 's' : ''} ($${data.revenue.toFixed(2)})`
        );

      const dateStr = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      const lines = [
        `📊 <b>DAILY SUMMARY — ${dateStr}</b>`,
        `━━━━━━━━━━━━━━━━━━━━━━`,
        ``,
        `✅ <b>Orders Completed:</b> ${stats.total_orders}`,
        `💰 <b>Revenue:</b> $${stats.total_revenue.toFixed(2)}`,
        `🤑 <b>Profit:</b> $${stats.total_profit.toFixed(2)}`,
        stats.total_orders > 0 ? `📈 <b>Avg/Order:</b> $${(stats.total_revenue / stats.total_orders).toFixed(2)}` : '',
        ``,
        `━━━━━━━━━━━━━━━━━━━━━━`,
        `<b>🎮 By Game</b>`,
        `━━━━━━━━━━━━━━━━━━━━━━`,
        ``,
        ...(gameLines.length > 0 ? gameLines : ['   No orders today']),
        ``,
        `━━━━━━━━━━━━━━━━━━━━━━`,
        ``,
        stats.total_orders > 0
          ? `⏱️  Last order: ${new Date(
              stats.orders[0]?.completed_at || ''
            ).toLocaleTimeString()}`
          : '💤 No activity today',
      ];

      await this.sendTelegram(lines.filter(Boolean).join('\n'), {
        inline_keyboard: [
          [
            {
              text: '📋 Open Bay2Game Dashboard',
              url: 'https://bay2game.xyz/partners/login.php',
            },
          ],
        ],
      });

      console.log(`📊 Daily summary sent: ${stats.total_orders} orders, $${stats.total_revenue.toFixed(2)} revenue`);
      return true;
    } catch (err: any) {
      console.warn(`⚠️  Daily summary failed: ${err.message || err}`);
      return false;
    }
  }

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
   * Send alerts when ANY order completes successfully — not just
   * awaiting_stock recovery. This keeps the admin informed of every
   * successful top-up in real time.
   */
  async alertOrderCompleted(order: {
    reference: string;
    game_name: string;
    product_name: string;
    player_id: string;
    server_id?: string;
    amount: number;
    completed_at: string;
  }): Promise<void> {
    await Promise.allSettled([
      this.sendTelegramCompleted(order),
      this.sendWebhook('order.completed', order),
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

  /**
   * Send the "order completed" Telegram alert.
   * Fires for EVERY successful top-up so the admin sees live activity.
   */
  private async sendTelegramCompleted(order: {
    reference: string;
    game_name: string;
    product_name: string;
    player_id: string;
    server_id?: string;
    amount: number;
    completed_at: string;
  }): Promise<void> {
    const lines = [
      `✅ <b>ORDER COMPLETED!</b>`,
      ``,
      `━━━━━━━━━━━━━━━━━━━`,
      `<b>📦 Order Delivered</b>`,
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
      `💰 <b>Profit:</b> $0.20 (your markup on this order)`,
      ``,
      `🔗 <a href="${config.frontendUrl}/order/${order.reference}">View Order Details</a>`,
    ];

    await this.sendTelegram(lines.filter(Boolean).join('\n'), {
      inline_keyboard: [
        [
          {
            text: '📋 View Order',
            url: `${config.frontendUrl}/order/${order.reference}`,
          },
        ],
      ],
    });
  }

  /**
   * Get an emoji for a game code to make the daily summary more visual.
   */
  private getGameEmoji(gameCode: string): string {
    const emojis: Record<string, string> = {
      mlbb: '🎮',
      'freefire_sgmy': '🔥',
      freefire: '🔥',
      pubgm: '⚔️',
      hok: '👑',
      'honor of kings': '👑',
      codm: '🎯',
      genshin: '✨',
      lol: '🏆',
      valorant: '🔫',
    };
    return emojis[gameCode.toLowerCase()] || '🎮';
  }
}

export const notificationService = new NotificationService();
