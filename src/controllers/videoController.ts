import { Response } from 'express';
import * as db from '../db';
import { AuthRequest } from '../middleware/auth';
import { sendSuccess, sendError, handleControllerError } from '../utils/response';

/**
 * Submit a video for review
 */
export async function submitVideo(req: AuthRequest, res: Response) {
  try {
    const { sessionId, videoUrl, color, wall } = req.body;
    
    if (!sessionId || !videoUrl || !color || !wall) {
      return sendError(res, 'Missing required fields: sessionId, videoUrl, color, wall', 400);
    }
    
    const video = await db.addVideoReview(sessionId, videoUrl, color, wall);
    return res.json(video);
  } catch (err: any) {
    return handleControllerError(res, err);
  }
}

/**
 * Get videos, optionally filtered by status
 */
export async function getVideos(req: AuthRequest, res: Response) {
  try {
    const { status } = req.query as any;
    const videos = await db.getVideoReviews(status);
    return res.json(videos);
  } catch (err: any) {
    return handleControllerError(res, err);
  }
}

/**
 * Vote on a video
 */
export async function voteOnVideo(req: AuthRequest, res: Response) {
  try {
    const reviewId = Number(req.params.id);
    const { vote } = req.body;
    
    if (vote !== 'up' && vote !== 'down') {
      return sendError(res, 'vote must be "up" or "down"', 400);
    }
    
    const result = await db.voteOnVideo(reviewId, req.user!.climberId, vote);
    return res.json(result);
  } catch (err: any) {
    return handleControllerError(res, err);
  }
}

/**
 * Approve a video (admin only)
 */
export async function approveVideo(req: AuthRequest, res: Response) {
  try {
    const reviewId = Number(req.params.id);
    const result = await db.approveVideo(reviewId);
    return res.json(result);
  } catch (err: any) {
    return handleControllerError(res, err);
  }
}

/**
 * Reject a video (admin only)
 */
export async function rejectVideo(req: AuthRequest, res: Response) {
  try {
    const reviewId = Number(req.params.id);
    const result = await db.rejectVideo(reviewId);
    return res.json(result);
  } catch (err: any) {
    return handleControllerError(res, err);
  }
}
