import { Request, Response, NextFunction } from 'express';

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface ErrorResponse {
  success: false;
  message: string;
  error: string;
  statusCode: number;
}

export interface SuccessResponse<T = unknown> {
  success: true;
  message: string;
  data: T;
}

export type AsyncHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void>;

export interface Bay2GameConfig {
  apiUrl: string;
  apiKey: string;
}

export interface BakongConfig {
  apiUrl: string;
  apiKey: string;
  accountId: string;
  merchantId: string;
  callbackUrl: string;
  returnUrl: string;
}
