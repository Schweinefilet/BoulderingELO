import { Response } from 'express';

/**
 * Utility functions for sending consistent API responses
 */

export function sendSuccess(res: Response, data: any, status: number = 200) {
  return res.status(status).json({ success: true, ...data });
}

export function sendError(res: Response, error: string, status: number = 500) {
  return res.status(status).json({ error });
}

export function handleControllerError(res: Response, err: any) {
  console.error('Controller error:', err);
  const message = err.message || 'Internal server error';
  const status = err.status || 500;
  return sendError(res, message, status);
}
