import { config } from '../config';
import { bay2gameApi } from '../utils/axios';
import {
  Bay2GameUser,
  Bay2GameCategory,
  Bay2GameProduct,
  Bay2GameOrder,
  Bay2GameCheckOrder,
} from '../types';
import { HTTP_STATUS, ERROR_MESSAGES, isBay2GameSuccess } from '../constants';
import { AppError } from '../middleware/errorHandler';

function getApiParams(): Record<string, string> {
  return { api_key: config.bay2game.apiKey };
}

export class Bay2GameService {
  /**
   * Get user profile and balance
   */
  async getUserProfile(): Promise<Bay2GameUser> {
    try {
      const { data } = await bay2gameApi.get('/api/profile', {
        params: getApiParams(),
      });

      if (!isBay2GameSuccess(data.status)) {
        throw new AppError(
          'Failed to get user profile',
          HTTP_STATUS.SERVICE_UNAVAILABLE
        );
      }

      return data.user as Bay2GameUser;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        ERROR_MESSAGES.API_FAILURE,
        HTTP_STATUS.SERVICE_UNAVAILABLE
      );
    }
  }

  /**
   * Get all available game categories
   */
  async getCategories(): Promise<Bay2GameCategory[]> {
    try {
      const { data } = await bay2gameApi.get('/api/categories', {
        params: getApiParams(),
      });

      if (!isBay2GameSuccess(data.status)) {
        throw new AppError(
          'Failed to fetch categories',
          HTTP_STATUS.SERVICE_UNAVAILABLE
        );
      }

      return data.categories as Bay2GameCategory[];
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        ERROR_MESSAGES.API_FAILURE,
        HTTP_STATUS.SERVICE_UNAVAILABLE
      );
    }
  }

  /**
   * Get products for a specific game
   */
  async getProducts(gameCode: string): Promise<Bay2GameProduct[]> {
    try {
      const { data } = await bay2gameApi.get('/api/products', {
        params: {
          ...getApiParams(),
          game_code: gameCode,
        },
      });

      if (!isBay2GameSuccess(data.status)) {
        throw new AppError(
          'Failed to fetch products',
          HTTP_STATUS.SERVICE_UNAVAILABLE
        );
      }

      return data.products as Bay2GameProduct[];
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        ERROR_MESSAGES.API_FAILURE,
        HTTP_STATUS.SERVICE_UNAVAILABLE
      );
    }
  }

  /**
   * Get products AND game details in a single API call
   */
  async getProductsWithGame(gameCode: string): Promise<{
    game: { game_code: string; name: string; description: string; image_url: string };
    products: Bay2GameProduct[];
  }> {
    try {
      const { data } = await bay2gameApi.get('/api/products', {
        params: {
          ...getApiParams(),
          game_code: gameCode,
        },
      });

      if (!isBay2GameSuccess(data.status)) {
        throw new AppError(
          'Failed to fetch products',
          HTTP_STATUS.SERVICE_UNAVAILABLE
        );
      }

      return {
        game: data.game,
        products: data.products as Bay2GameProduct[],
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        ERROR_MESSAGES.API_FAILURE,
        HTTP_STATUS.SERVICE_UNAVAILABLE
      );
    }
  }

  /**
   * Create a new order (top-up)
   */
  async createOrder(params: {
    productCode: string;
    gameUserId: string;
    reference: string;
    gameZoneId?: string;
  }): Promise<Bay2GameOrder> {
    try {
      const { data } = await bay2gameApi.get('/api/create_order', {
        params: {
          ...getApiParams(),
          product_code: params.productCode,
          game_user_id: params.gameUserId,
          reference: params.reference,
          ...(params.gameZoneId && { game_zone_id: params.gameZoneId }),
        },
      });

      if (!isBay2GameSuccess(data.status)) {
        if (data.message?.toLowerCase().includes('balance')) {
          throw new AppError(
            ERROR_MESSAGES.INSUFFICIENT_BALANCE,
            HTTP_STATUS.UNPROCESSABLE_ENTITY
          );
        }
        if (data.message?.toLowerCase().includes('invalid')) {
          throw new AppError(
            ERROR_MESSAGES.INVALID_PRODUCT,
            HTTP_STATUS.BAD_REQUEST
          );
        }
        throw new AppError(
          data.message || 'Order creation failed',
          HTTP_STATUS.UNPROCESSABLE_ENTITY
        );
      }

      return data as Bay2GameOrder;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        ERROR_MESSAGES.API_FAILURE,
        HTTP_STATUS.SERVICE_UNAVAILABLE
      );
    }
  }

  /**
   * Check order status by reference
   */
  async checkOrder(reference: string): Promise<Bay2GameCheckOrder> {
    try {
      const { data } = await bay2gameApi.get('/api/check_order', {
        params: {
          ...getApiParams(),
          reference,
        },
      });

      if (!isBay2GameSuccess(data.status)) {
        throw new AppError(
          ERROR_MESSAGES.ORDER_NOT_FOUND,
          HTTP_STATUS.NOT_FOUND
        );
      }

      return data as Bay2GameCheckOrder;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        ERROR_MESSAGES.API_FAILURE,
        HTTP_STATUS.SERVICE_UNAVAILABLE
      );
    }
  }
}

export const bay2gameService = new Bay2GameService();
