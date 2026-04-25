import { Cloudinary } from 'cloudinary-core';

/**
 * Cloudinary Configuration provided by user:
 * Cloud Name: levelupai
 * API Key: 231998119245191
 * API Secret: x7fhObTKYVScMD4CZD3t-pc9_hw
 * Cloudinary ID: 702f5b9f2ea2f82c2507f8d23b6f7d
 */

const CLOUD_NAME = 'levelupai';
const UPLOAD_PRESET = 'unsigned_upload'; // Note: Client-side uploads usually require an unsigned preset or a signature from a backend.

// For client-side uploads, we generally use the REST API or the Upload widget
// because using the API Secret in the frontend is extremely insecure.
// However, I will implement a helper that uses the REST API.

export const uploadToCloudinary = async (file: Blob | File, folder: string = 'general'): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', 'ml_default'); 
  formData.append('cloud_name', CLOUD_NAME);
  formData.append('api_key', '231998119245191'); 
  formData.append('folder', `levelup/${folder}`);

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
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
