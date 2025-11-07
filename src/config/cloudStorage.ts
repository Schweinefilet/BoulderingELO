import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

// Configure Cloudinary
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

// Check if Cloudinary is configured
export const isCloudinaryConfigured = !!(
  CLOUDINARY_CLOUD_NAME &&
  CLOUDINARY_API_KEY &&
  CLOUDINARY_API_SECRET
);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
  });
  console.log('✅ Cloudinary configured for persistent image storage');
} else {
  console.warn('⚠️  Cloudinary not configured - images will be stored locally (ephemeral on Render)');
  console.warn('   Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET environment variables');
}

// Create Cloudinary storage for multer
export const cloudinaryStorage = isCloudinaryConfigured
  ? new CloudinaryStorage({
      cloudinary: cloudinary,
      params: async (req: any, file: any) => ({
        folder: 'bouldering-elo/wall-sections',
        format: 'jpg',
        transformation: [
          { width: 1200, height: 1200, crop: 'limit' },
          { quality: 'auto:good' },
        ],
        public_id: `wall-section-${Date.now()}-${Math.round(Math.random() * 1E9)}`,
      }),
    } as any)
  : null;

// Delete image from Cloudinary
export async function deleteCloudinaryImage(publicId: string): Promise<void> {
  if (!isCloudinaryConfigured) {
    console.warn('Cloudinary not configured, cannot delete image');
    return;
  }
  
  try {
    await cloudinary.uploader.destroy(publicId);
    console.log(`Deleted image from Cloudinary: ${publicId}`);
  } catch (error) {
    console.error('Error deleting image from Cloudinary:', error);
    throw error;
  }
}

// Extract public_id from Cloudinary URL
export function extractPublicIdFromUrl(url: string): string | null {
  // Cloudinary URL format: https://res.cloudinary.com/{cloud_name}/image/upload/v{version}/{public_id}.{format}
  const match = url.match(/\/bouldering-elo\/wall-sections\/[^.]+/);
  if (match) {
    return match[0].substring(1); // Remove leading slash
  }
  return null;
}

export { cloudinary };
