import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import dotenv from 'dotenv';

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Helper function to determine resource type
const getResourceType = (req, file) => {
  if (file.mimetype.startsWith('video/')) {
    return 'video';
  }
  return 'image';
};

// Config generator for different folders
const createStorage = (folderName) => {
  return new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
      const isVideo = file.mimetype.startsWith('video/');
      return {
        folder: `maatram-alumniconnect/${folderName}`,
        resource_type: isVideo ? 'video' : 'image',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'mp4', 'mov', 'webm'],
        // For video uploads, we can't do simple transformations like width/height directly in params for all cases without chunking,
        // so we'll let Cloudinary handle optimization based on format auto.
      };
    },
  });
};

// File validation filter
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
    'video/mp4', 'video/quicktime', 'video/webm'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, WEBP images and MP4, MOV, WEBM videos are allowed.'), false);
  }
};

// Multer instances for different parts of the app
// Set size limit to 50MB
const uploadConfig = {
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: fileFilter,
};

export const uploadPostMedia = multer({ storage: createStorage('posts'), ...uploadConfig });
export const uploadProfileMedia = multer({ storage: createStorage('profiles'), ...uploadConfig });
export const uploadEventMedia = multer({ storage: createStorage('events'), ...uploadConfig });
export const uploadChatMedia = multer({ storage: createStorage('chat-media'), ...uploadConfig });

export default cloudinary;
