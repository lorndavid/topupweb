import { Request, Response, NextFunction } from 'express';
import { HTTP_STATUS } from '../constants';

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function errorHandler(
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('Error:', err.message);

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      error: err.message,
      statusCode: err.statusCode,
    });
    return;
  }

  // Handle Axios errors
  if (err.name === 'AxiosError') {
    res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
      success: false,
      message: 'External API service unavailable',
      error: 'External API Error',
      statusCode: HTTP_STATUS.SERVICE_UNAVAILABLE,
    });
    return;
  }

  // Handle unknown errors
  res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
    success: false,
    message: 'Internal server error',
    error:
      process.env.NODE_ENV === 'development' ? err.message : 'Server Error',
    statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  });
}

export function notFoundHandler(
  _req: Request,
  res: Response
): void {
  res.status(HTTP_STATUS.NOT_FOUND).json({
    success: false,
    message: 'Resource not found',
    error: 'Not Found',
    statusCode: HTTP_STATUS.NOT_FOUND,
  });
}
