import { Request, Response, NextFunction } from 'express';
import { bay2gameService } from '../services/bay2game.service';
import { HTTP_STATUS } from '../constants';

/**
 * GET /api/balance
 *
 * Returns the reseller's Bay2Game balance so the customer-facing payment
 * page can show a warning if the shop is low on stock before they pay.
 *
 * Response:
 *   {
 *     balance: number,     // Current Bay2Game wallet balance (USD)
 *     username: string,    // Reseller's Bay2Game username
 *     available: boolean   // Whether we could reach Bay2Game API
 *   }
 *
 * If the Bay2Game API is unreachable, we still return a 200 with
 * available: false so the frontend can decide how to handle it.
 */
export async function getBalance(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const profile = await bay2gameService.getUserProfile();

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Balance retrieved',
      data: {
        balance: profile.balance,
        username: profile.username,
        available: true,
      },
    });
  } catch {
    // Bay2Game API might be down or API key invalid
    // Return a safe response — frontend can show a neutral message
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Balance unavailable',
      data: {
        balance: 0,
        username: '',
        available: false,
      },
    });
  }
}
