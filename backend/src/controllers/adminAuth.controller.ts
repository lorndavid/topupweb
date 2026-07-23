import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { HTTP_STATUS } from '../constants';
import axios from 'axios';

const JWT_SECRET = config.admin?.jwtSecret || 'admin-secret-change-in-production';
const ADMIN_USERNAME = config.admin?.username || 'admin';
const ADMIN_PASSWORD = config.admin?.password || 'admin123';

/**
 * Login with username + password (local admin account)
 */
export async function login(req: Request, res: Response) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Username and password are required',
      });
    }

    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'Invalid username or password',
      });
    }

    const token = jwt.sign(
      { username, role: 'admin', loginMethod: 'password' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.json({
      success: true,
      message: 'Login successful',
      data: {
        id: 'admin',
        username,
        role: 'admin',
        token,
        loginMethod: 'password',
      },
    });
  } catch (error) {
    console.error('Admin login error:', error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Login failed',
    });
  }
}

/**
 * Login with Bay2Game API key — validates the key against Bay2Game's profile API,
 * then issues a JWT token with the user's profile data embedded.
 */
export async function loginWithApiKey(req: Request, res: Response) {
  try {
    const { apiKey } = req.body;

    if (!apiKey) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'API key is required',
      });
    }

    // Validate the API key by calling Bay2Game profile API
    const profileRes = await axios.get(
      `https://api.bay2game.xyz/api/profile?api_key=${encodeURIComponent(apiKey)}`,
      {
        headers: { Accept: 'application/json' },
        timeout: 10000,
      }
    );

    const profileData = profileRes.data;

    if (!profileData || profileData.status?.toLowerCase() !== 'success' || !profileData.user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'Invalid API key — could not verify with Bay2Game',
      });
    }

    const user = profileData.user;

    // Issue JWT with Bay2Game profile embedded
    const token = jwt.sign(
      {
        username: user.username,
        role: 'admin',
        loginMethod: 'apikey',
        bay2game: {
          apiKey,
          balance: user.balance,
          totalOrders: user.total_orders,
          totalSpent: user.total_spent,
        },
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.json({
      success: true,
      message: 'API key verified — login successful',
      data: {
        id: `bay2game-${user.id}`,
        username: user.username,
        role: 'admin',
        token,
        loginMethod: 'apikey',
        apiKey,
        profile: {
          balance: user.balance,
          totalOrders: user.total_orders,
          totalSpent: user.total_spent,
        },
      },
    });
  } catch (error: any) {
    console.error('API key login error:', error?.message || error);

    if (error?.response?.status === 401 || error?.response?.status === 403) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'Invalid API key — rejected by Bay2Game',
      });
    }

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to verify API key with Bay2Game. Check your connection.',
    });
  }
}

/**
 * JWT verification middleware — protects all admin routes.
 */
export function verifyToken(req: Request, res: Response, next: Function) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      message: 'Authentication required',
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    (req as any).admin = decoded;
    next();
  } catch {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
}
