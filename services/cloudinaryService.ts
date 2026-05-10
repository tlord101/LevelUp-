import { Cloudinary } from 'cloudinary-core';
import { getAdminSettings } from './adminService';

/**
 * Cloudinary Configuration provided by user:
 * Cloud Name: levelupai
 * API Key: 231998119245191
 * API Secret: x7fhObTKYVScMD4CZD3t-pc9_hw
 * Cloudinary ID: 702f5b9f2ea2f82c2507f8d23b6f7d
 */

// Fallback defaults
const DEFAULT_CLOUD_NAME = 'levelupai';
const DEFAULT_API_KEY = '231998119245191';

export const uploadToCloudinary = async (file: Blob | File, folder: string = 'general'): Promise<string> => {
  let cloudName = DEFAULT_CLOUD_NAME;
  let apiKey = DEFAULT_API_KEY;

  try {
    const config = await getAdminSettings('api');
    if (config?.cloudinaryCloudName) cloudName = config.cloudinaryCloudName;
    if (config?.cloudinaryApiKey) apiKey = config.cloudinaryApiKey;
  } catch (err) {
    console.error('Failed to fetch Cloudinary config from Firestore:', err);
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', 'ml_default'); 
  formData.append('cloud_name', cloudName);
  formData.append('api_key', apiKey); 
  formData.append('folder', `levelup/${folder}`);

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Upload failed');
    }

    const data = await response.json();
    return data.secure_url;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
};
