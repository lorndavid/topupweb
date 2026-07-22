import { Request, Response } from 'express';
import axios from 'axios';
import { config } from '../config';
import { HTTP_STATUS } from '../constants';

/**
 * Get the Bay2Game API key from the JWT payload or fall back to config.
 * When logged in via API Key, the key is in the JWT. Otherwise use the env config.
 */
function getApiKey(req: Request): string {
  const admin = (req as any).admin;
  return admin?.bay2game?.apiKey || config.bay2game.apiKey || '';
}

/** Detect if an axios error is a Bay2Game auth rejection */
function isBay2GameAuthError(error: any): boolean {
  const status = error?.response?.status;
  return status === 401 || status === 403;
}

// ─── 1. FUNDING HISTORY ────────────────────────────────

/**
 * GET /admin/funding-history
 * Returns Bay2Game profile with current balance and total spent.
 * In production, this would show historical balance changes from a local DB.
 */
export async function getFundingHistory(req: Request, res: Response) {
  try {
    const apiKey = getApiKey(req);
    if (!apiKey) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'No Bay2Game API key configured',
      });
    }

    const profileRes = await axios.get(
      `https://api.bay2game.xyz/api/profile?api_key=${encodeURIComponent(apiKey)}`,
      { headers: { Accept: 'application/json' }, timeout: 10000 }
    );

    const data = profileRes.data;
    if (data?.status === 'SUCCESS' && data?.user) {
      return res.json({
        success: true,
        message: 'Funding history retrieved',
        data: {
          currentBalance: data.user.balance,
          totalSpent: data.user.total_spent,
          totalOrders: data.user.total_orders,
          username: data.user.username,
          // In production, fetch from local DB for full history
          history: [],
        },
      });
    }

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Bay2Game profile API returned unexpected response',
    });
  } catch (error: any) {
    console.error('Error fetching funding history:', error?.message);
    const statusCode = error?.response?.status || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    const detail = error?.response?.data || error?.message || 'Unknown error';
    if (isBay2GameAuthError(error)) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'Bay2Game API key is invalid or rejected. Log in via API Key tab or set BAY2GAME_API_KEY in .env.',
        detail,
      });
    }
    return res.status(statusCode).json({
      success: false,
      message: `Bay2Game API error: ${error?.message || 'Request failed'}`,
      detail,
    });
  }
}

// ─── 2. BALANCE ALERT ───────────────────────────────────

/**
 * GET /admin/balance-alert
 * Checks the current Bay2Game balance and returns an alert if below threshold.
 */
export async function getBalanceAlert(req: Request, res: Response) {
  try {
    const apiKey = getApiKey(req);
    if (!apiKey) {
      return res.json({
        success: true,
        data: {
          balance: null,
          threshold: 10,
          isLow: false,
          message: 'No API key configured — balance check unavailable',
        },
      });
    }

    const profileRes = await axios.get(
      `https://api.bay2game.xyz/api/profile?api_key=${encodeURIComponent(apiKey)}`,
      { headers: { Accept: 'application/json' }, timeout: 10000 }
    );

    const data = profileRes.data;
    const balance = data?.status === 'SUCCESS' && data?.user ? data.user.balance : null;
    const threshold = 10;
    const isLow = balance !== null && balance < threshold;

    return res.json({
      success: true,
      data: {
        balance,
        threshold,
        isLow,
        message: isLow
          ? `⚠️ Balance $${balance} is below $${threshold}. Top up soon to avoid failed orders.`
          : balance !== null
            ? `Balance $${balance} is healthy.`
            : 'Could not fetch balance. Check your API key.',
      },
    });
  } catch (error: any) {
    console.error('Error checking balance alert:', error?.message);
    return res.json({
      success: true,
      data: {
        balance: null,
        threshold: 10,
        isLow: false,
        message: 'Balance check unavailable — Bay2Game API error',
      },
    });
  }
}

// ─── 3. WEBHOOK MANAGEMENT ─────────────────────────────

/**
 * GET /admin/webhooks
 * Returns the current webhook configuration (callback URL from config)
 */
export async function getWebhookConfig(_req: Request, res: Response) {
  try {
    const callbackUrl = config.bakong.callbackUrl || '';
    const returnUrl = config.bakong.returnUrl || '';

    return res.json({
      success: true,
      message: 'Webhook configuration retrieved',
      data: {
        bakongCallbackUrl: callbackUrl,
        bakongReturnUrl: returnUrl,
        // Bay2Game webhook would be set on their partner dashboard
        bay2gameNote: 'Bay2Game webhooks are configured on their partner dashboard at https://bay2game.xyz/partners/login.php',
      },
    });
  } catch (error: any) {
    console.error('Error fetching webhook config:', error?.message);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to fetch webhook configuration',
    });
  }
}

/**
 * POST /admin/webhooks/test
 * Sends a test webhook payload to the configured callback URL
 */
export async function testWebhook(req: Request, res: Response) {
  try {
    const callbackUrl = config.bakong.callbackUrl;
    if (!callbackUrl) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'No webhook callback URL configured',
      });
    }

    // Send a test payload
    const payload = {
      type: 'TEST',
      message: 'This is a test webhook from VidTopUp Admin',
      timestamp: new Date().toISOString(),
    };

    // We don't await this — it's a fire-and-forget test
    axios.post(callbackUrl, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000,
    }).then((response) => {
      console.log(`Test webhook sent to ${callbackUrl} — response: ${response.status}`);
    }).catch((err) => {
      console.warn(`Test webhook to ${callbackUrl} failed:`, err?.message);
    });

    return res.json({
      success: true,
      message: `Test webhook sent to ${callbackUrl}`,
    });
  } catch (error: any) {
    console.error('Error testing webhook:', error?.message);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to test webhook',
    });
  }
}

// ─── 3. DIRECT PLAYER ID CHECK ─────────────────────────

/**
 * POST /admin/check-player-id
 * Directly checks a player ID against Bay2Game's check_id API
 */
export async function checkPlayerId(req: Request, res: Response) {
  try {
    const { game, userid, serverid } = req.body;

    if (!game || !userid) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Game code and player ID are required',
      });
    }

    const params: Record<string, string> = { game, userid };
    if (serverid) params.serverid = serverid;

    const checkRes = await axios.get('https://checkid.bay2game.xyz/check_id', {
      params,
      headers: { Accept: 'application/json' },
      timeout: 15000,
    });

    const data = checkRes.data;

    if (data?.status === 'APPROVED') {
      return res.json({
        success: true,
        message: 'Player ID verified successfully',
        data: {
          status: data.status,
          username: data.username || 'Unknown',
          region: data.region || '',
          gameTitle: data.game_title || '',
          timestamp: data.timestamp || new Date().toISOString(),
          developer: data.developer || '',
        },
      });
    }

    return res.json({
      success: false,
      message: data?.message || 'Player ID not found or invalid',
      data: {
        status: data?.status || 'NOT_ALLOW',
        username: null,
        region: null,
        gameTitle: null,
      },
    });
  } catch (error: any) {
    console.error('Error checking player ID:', error?.message);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to check player ID. The API may be temporarily unavailable.',
    });
  }
}

// ─── 4. DIRECT ORDER CREATION ──────────────────────────

/**
 * GET /admin/direct-order/games
 * Returns available games for direct ordering
 */
export async function getDirectOrderGames(req: Request, res: Response) {
  try {
    const apiKey = getApiKey(req);
    if (!apiKey) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'No Bay2Game API key configured',
      });
    }

    const catsRes = await axios.get(
      `https://api.bay2game.xyz/api/categories?api_key=${encodeURIComponent(apiKey)}`,
      { headers: { Accept: 'application/json' }, timeout: 10000 }
    );

    const data = catsRes.data;
    if (data?.status === 'SUCCESS' && data?.categories) {
      return res.json({
        success: true,
        message: 'Games retrieved',
        data: data.categories.map((cat: any) => ({
          game_code: cat.game_code,
          name: cat.name,
          description: cat.description,
          image_url: cat.image_url,
          game_fields: cat.game_fields,
        })),
      });
    }

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to fetch games from Bay2Game',
    });
  } catch (error: any) {
    console.error('Error fetching direct order games:', error?.message);
    const statusCode2 = error?.response?.status || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    const detail2 = error?.response?.data || error?.message || 'Unknown error';
    if (isBay2GameAuthError(error)) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'Bay2Game API key is invalid or rejected. Log in via API Key tab or set BAY2GAME_API_KEY in .env.',
        detail: detail2,
      });
    }
    return res.status(statusCode2).json({
      success: false,
      message: `Bay2Game API error: ${error?.message || 'Failed to fetch games'}`,
      detail: detail2,
    });
  }
}

/**
 * GET /admin/direct-order/products/:gameCode
 * Returns products for a specific game with cost prices
 */
export async function getDirectOrderProducts(req: Request, res: Response) {
  try {
    const apiKey = getApiKey(req);
    if (!apiKey) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'No Bay2Game API key configured',
      });
    }

    const { gameCode } = req.params;
    const prodRes = await axios.get(
      `https://api.bay2game.xyz/api/products?api_key=${encodeURIComponent(apiKey)}&game_code=${encodeURIComponent(gameCode)}`,
      { headers: { Accept: 'application/json' }, timeout: 10000 }
    );

    const data = prodRes.data;
    if (data?.status === 'SUCCESS' && data?.products) {
      return res.json({
        success: true,
        message: 'Products retrieved',
        data: {
          game: data.game,
          products: data.products.map((p: any) => ({
            id: p.id,
            product_code: p.product_code,
            name: p.name,
            cost_price: p.sell_price,
            status: p.status,
          })),
        },
      });
    }

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to fetch products from Bay2Game',
    });
  } catch (error: any) {
    console.error('Error fetching direct order products:', error?.message);
    const statusCode3 = error?.response?.status || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    const detail3 = error?.response?.data || error?.message || 'Unknown error';
    return res.status(statusCode3).json({
      success: false,
      message: `Bay2Game API error: ${error?.message || 'Failed to fetch products'}`,
      detail: detail3,
    });
  }
}

/**
 * POST /admin/direct-order/create
 * Creates a direct order via Bay2Game API (bypasses customer payment flow)
 */
export async function createDirectOrder(req: Request, res: Response) {
  try {
    const apiKey = getApiKey(req);
    if (!apiKey) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'No Bay2Game API key configured',
      });
    }

    const { productCode, gameUserId, gameZoneId, reference } = req.body;

    if (!productCode || !gameUserId || !reference) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Product code, player ID, and reference are required',
      });
    }

    const params: Record<string, string> = {
      api_key: apiKey,
      product_code: productCode,
      game_user_id: gameUserId,
      reference,
    };
    if (gameZoneId) params.game_zone_id = gameZoneId;

    const orderRes = await axios.get('https://api.bay2game.xyz/api/create_order', {
      params,
      headers: { Accept: 'application/json' },
      timeout: 20000,
    });

    const data = orderRes.data;

    if (data?.status === 'SUCCESS') {
      return res.json({
        success: true,
        message: 'Order created successfully',
        data: {
          reference: data.reference,
          productName: data.product_name,
          gameName: data.game_name,
          gameUserId: data.game_user_id,
          amount: data.amount,
          balanceBefore: data.balance_before,
          balanceAfter: data.balance_after,
          createdAt: data.created_at,
          completedAt: data.completed_at,
        },
      });
    }

    return res.status(HTTP_STATUS.UNPROCESSABLE_ENTITY).json({
      success: false,
      message: data?.message || 'Order creation failed',
      data: data || {},
    });
  } catch (error: any) {
    console.error('Error creating direct order:', error?.message);
    if (error?.response?.status === 422 || error?.response?.status === 400) {
      return res.status(HTTP_STATUS.UNPROCESSABLE_ENTITY).json({
        success: false,
        message: error?.response?.data?.message || 'Bay2Game rejected the order. Check your balance and player ID.',
        data: error?.response?.data || {},
      });
    }
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to create direct order. Bay2Game may be unavailable.',
    });
  }
}
