// Temporary ambient module declarations to satisfy the workspace TypeScript build.
// These are minimal shims — a cleaner long-term fix is to install proper @types packages
// or replace any "any" uses with typed alternatives.

declare module 'cloudinary';
declare module 'multer-storage-cloudinary';
declare module 'bcrypt';
declare module 'jsonwebtoken';
declare module 'google-auth-library';
declare module 'multer';
declare module 'sharp';
declare module 'nodemailer';

// Augment Express Request to include `file` (used by multer middleware in routes)
declare namespace Express {
  interface Request {
    file?: any;
  }
}
