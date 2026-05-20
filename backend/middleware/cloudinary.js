import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'maatram',
  api_key: process.env.CLOUDINARY_API_KEY || 'mock_key',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'mock_secret',
});

/**
 * Uploads a base64 media asset (image/video) directly to Cloudinary
 * @param {string} base64Str - The base64 file data string
 * @param {string} folder - Destination folder on Cloudinary
 * @returns {Promise<string>} - Returns secure URL from Cloudinary
 */
export const uploadToCloudinary = async (base64Str, folder = 'maatram') => {
  try {
    if (!base64Str) return '';
    // If it's already a secure Cloudinary url or external URL, return it directly
    if (base64Str.startsWith('http://') || base64Str.startsWith('https://')) {
      return base64Str;
    }

    // Direct Cloudinary upload
    const uploadRes = await cloudinary.uploader.upload(base64Str, {
      folder: folder,
      resource_type: 'auto', // Supports image, video, etc.
    });
    
    return uploadRes.secure_url;
  } catch (error) {
    console.error('Cloudinary upload failure:', error);
    // Graceful fallback: If keys are missing or invalid, return the original base64
    // This allows the app to function locally in mock/offline mode with base64 storage
    return base64Str;
  }
};

export default cloudinary;
