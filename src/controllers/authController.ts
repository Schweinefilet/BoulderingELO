import { Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import * as db from '../db';
import { AuthRequest } from '../middleware/auth';
import { JWT_SECRET, GOOGLE_CLIENT_ID, RESET_TOKEN_EXPIRY_MINUTES } from '../config/constants';
import { sendSuccess, sendError, handleControllerError } from '../utils/response';
import { buildResetUrl, sendPasswordResetEmail } from '../utils/email';

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

/**
 * Handle user login
 */
export async function login(req: AuthRequest, res: Response) {
  try {
    const { username, password } = req.body;
    
    const climber = await db.getClimberByUsername(username.toLowerCase());
    
    if (!climber || !climber.password) {
      return sendError(res, 'Invalid credentials', 401);
    }
    
    const validPassword = await bcrypt.compare(password, climber.password);
    
    if (!validPassword) {
      return sendError(res, 'Invalid credentials', 401);
    }
    
    const token = jwt.sign(
      { climberId: climber.id, username: climber.username, role: climber.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );
    
    return sendSuccess(res, {
      token,
      user: {
        climberId: climber.id,
        username: climber.username,
        role: climber.role
      }
    });
  } catch (err: any) {
    return handleControllerError(res, err);
  }
}

/**
 * Handle Google OAuth login/registration
 */
export async function googleAuth(req: AuthRequest, res: Response) {
  try {
    const { credential, customName, customUsername } = req.body;
    
    if (!credential) {
      return sendError(res, 'Google credential required', 400);
    }
    
    if (!GOOGLE_CLIENT_ID) {
      return sendError(res, 'Google authentication not configured', 500);
    }
    
    // Verify the Google token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return sendError(res, 'Invalid Google token', 401);
    }
    
    const email = payload.email;
    // Use customName if provided, otherwise use name from Google, or email prefix as fallback
    const name = customName || payload.name || email.split('@')[0];
    // Use customUsername if provided, otherwise use email as username
    const username = customUsername || email.toLowerCase();
    const googleId = payload.sub;
    
    // Check if a user exists with this Google ID
    const existingGoogleUser = await db.getClimberByGoogleId(googleId);
    if (existingGoogleUser) {
      // User already has a Google account linked - log them in
      const token = jwt.sign(
        { climberId: existingGoogleUser.id, username: existingGoogleUser.username, role: existingGoogleUser.role },
        JWT_SECRET,
        { expiresIn: '30d' }
      );
      
      return sendSuccess(res, {
        token,
        user: {
          climberId: existingGoogleUser.id,
          username: existingGoogleUser.username,
          role: existingGoogleUser.role
        }
      });
    }
    
    // Check if user exists by username
    let climber = await db.getClimberByUsername(username);
    
    if (!climber) {
      // Create new user with Google account
      climber = await db.addClimber(name, username, null, 'user', googleId);
    } else {
      // Link Google account to existing user
      await db.linkGoogleAccount(climber.id!, googleId);
      climber.google_id = googleId;
    }
    
    const token = jwt.sign(
      { climberId: climber.id, username: climber.username, role: climber.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );
    
    return sendSuccess(res, {
      token,
      user: {
        climberId: climber.id,
        username: climber.username,
        role: climber.role
      }
    });
  } catch (err: any) {
    console.error('Google auth error:', err);
    return handleControllerError(res, err);
  }
}

/**
 * Return Google OAuth configuration status
 */
export async function getGoogleConfig(req: AuthRequest, res: Response) {
  try {
    const enabled = !!GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID.length > 0;
    return sendSuccess(res, { enabled, clientId: enabled ? GOOGLE_CLIENT_ID : null });
  } catch (err: any) {
    return handleControllerError(res, err);
  }
}

/**
 * Link Google account to currently logged-in user
 */
export async function linkGoogleAccount(req: AuthRequest, res: Response) {
  try {
    const { credential } = req.body;
    
    if (!credential) {
      return sendError(res, 'Google credential required', 400);
    }
    
    if (!GOOGLE_CLIENT_ID) {
      return sendError(res, 'Google authentication not configured', 500);
    }
    
    if (!req.user) {
      return sendError(res, 'User not authenticated', 401);
    }
    
    // Verify the Google token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return sendError(res, 'Invalid Google token', 401);
    }
    
    const googleId = payload.sub;
    
    // Check if this Google ID is already linked to another account
    const existingGoogleUser = await db.getClimberByGoogleId(googleId);
    if (existingGoogleUser && existingGoogleUser.id !== req.user.climberId) {
      return sendError(res, 'This Google account is already linked to another user', 400);
    }
    
    // Link Google account to current user
    await db.linkGoogleAccount(req.user.climberId, googleId);
    
    return sendSuccess(res, { 
      message: 'Google account linked successfully',
      googleId: googleId 
    });
  } catch (err: any) {
    console.error('Link Google account error:', err);
    return handleControllerError(res, err);
  }
}

/**
 * Handle user registration
 */
export async function register(req: AuthRequest, res: Response) {
  try {
    const { name, username, password } = req.body;
    
    if (!name || !username || !password) {
      return sendError(res, 'name, username, and password required', 400);
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const climber = await db.addClimber(name, username.toLowerCase(), hashedPassword, 'user');
    
    const token = jwt.sign(
      { climberId: climber.id, username: climber.username, role: climber.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );
    
    return sendSuccess(res, {
      token,
      user: {
        climberId: climber.id,
        username: climber.username,
        role: climber.role
      }
    });
  } catch (err: any) {
    return handleControllerError(res, err);
  }
}

/**
 * Handle password change
 */
export async function changePassword(req: AuthRequest, res: Response) {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return sendError(res, 'currentPassword and newPassword required', 400);
    }
    
    if (newPassword.length < 6) {
      return sendError(res, 'New password must be at least 6 characters', 400);
    }
    
    const climber = await db.getClimberByUsername(req.user!.username);
    if (!climber || !climber.password) {
      return sendError(res, 'User account not found', 404);
    }
    
    const valid = await bcrypt.compare(currentPassword, climber.password);
    if (!valid) {
      return sendError(res, 'Current password is incorrect', 401);
    }
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.updateClimberPassword(climber.id!, hashedPassword);
    await db.invalidateResetTokensForUser(climber.id!);

    return sendSuccess(res, { message: 'Password updated successfully' });
  } catch (err: any) {
    return handleControllerError(res, err);
  }
}

const GENERIC_RESET_MESSAGE = { message: 'If that email is registered, a password reset link has been sent.' };

/**
 * Request a password reset token for an account
 */
export async function forgotPassword(req: AuthRequest, res: Response) {
  try {
    // TODO: Add rate limiting middleware here (per IP and per email) when available in the project
    const email = (req.body.email || '').trim().toLowerCase();

    if (!email) {
      return sendSuccess(res, GENERIC_RESET_MESSAGE);
    }

    const climber = await db.getClimberByUsername(email);

    if (climber) {
      const token = crypto.randomBytes(32).toString('base64url');
      const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000);

      await db.invalidateResetTokensForUser(climber.id!);
      await db.createPasswordResetToken(climber.id!, token, expiresAt);

      const resetUrl = buildResetUrl(token);
      await sendPasswordResetEmail(climber.username, resetUrl, climber.name || climber.username);

      console.info('Password reset requested', { climberId: climber.id, username: climber.username });
    } else {
      console.info('Password reset requested for unknown account', { email });
    }

    return sendSuccess(res, GENERIC_RESET_MESSAGE);
  } catch (err: any) {
    return handleControllerError(res, err);
  }
}

/**
 * Validate reset token for SPA flows
 */
export async function validateResetToken(req: AuthRequest, res: Response) {
  try {
    const token = (req.query.token || req.body.token || '') as string;

    if (!token) {
      return sendError(res, 'Invalid or expired token', 400);
    }

    const resetToken = await db.findPasswordResetToken(token);
    if (!resetToken || resetToken.used || new Date(resetToken.expires_at) < new Date()) {
      return sendError(res, 'Invalid or expired token', 400);
    }

    return sendSuccess(res, { valid: true });
  } catch (err: any) {
    return handleControllerError(res, err);
  }
}

/**
 * Complete password reset
 */
export async function resetPassword(req: AuthRequest, res: Response) {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return sendError(res, 'token and newPassword required', 400);
    }

    if (newPassword.length < 6) {
      return sendError(res, 'New password must be at least 6 characters', 400);
    }

    const resetToken = await db.findPasswordResetToken(token);
    if (!resetToken || resetToken.used || new Date(resetToken.expires_at) < new Date()) {
      return sendError(res, 'Invalid or expired token', 400);
    }

    const climber = await db.getClimberById(resetToken.climber_id);
    if (!climber || !climber.password) {
      return sendError(res, 'Invalid or expired token', 400);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.updateClimberPassword(climber.id!, hashedPassword);
    await db.markResetTokenUsed(token);
    await db.invalidateResetTokensForUser(climber.id!);

    console.info('Password reset completed', { climberId: climber.id, username: climber.username });

    return sendSuccess(res, { message: 'Password reset successful' });
  } catch (err: any) {
    return handleControllerError(res, err);
  }
}
