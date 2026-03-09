import { config } from '../config';
import { logger } from './logger';

// ---------------------------------------------------------------------------
// Cloud Storage Service — abstracts image uploads to S3, Azure Blob, or local.
// In demo mode, stores in IndexedDB. In production, uploads to cloud.
// ---------------------------------------------------------------------------

export interface UploadResult {
  url: string;
  key: string;
  size: number;
  mimeType: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  progress: number; // 0-100
}

export const cloudStorageService = {
  /**
   * Upload an image file to cloud storage (S3/Azure) or local IndexedDB.
   */
  async uploadImage(
    file: File,
    onProgress?: (progress: UploadProgress) => void,
  ): Promise<UploadResult> {
    if (config.isDemo) {
      // Demo mode — simulate upload and return data URL
      return simulateUpload(file, onProgress);
    }

    // Production — upload to configured cloud provider
    if (config.s3UploadUrl) {
      return uploadToS3(file, config.s3UploadUrl, onProgress);
    }

    throw new Error('Cloud storage not configured');
  },

  /**
   * Delete an image from cloud storage.
   */
  async deleteImage(key: string): Promise<void> {
    if (config.isDemo) {
      logger.debug('Demo: Skipping image deletion', { key });
      return;
    }

    if (config.s3UploadUrl) {
      await fetch(`${config.s3UploadUrl}/${key}`, { method: 'DELETE' });
      return;
    }

    throw new Error('Cloud storage not configured');
  },

  /**
   * Get a signed URL for a private image.
   */
  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    if (config.isDemo) {
      // In demo, images are data URLs, return as-is
      return key;
    }

    const response = await fetch(`${config.apiBaseUrl}/storage/sign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, expiresIn }),
    });

    if (!response.ok) throw new Error('Failed to get signed URL');
    const data = await response.json();
    return data.url;
  },
};

// ---------------------------------------------------------------------------
// Demo mode: simulate upload with data URL
// ---------------------------------------------------------------------------

function simulateUpload(
  file: File,
  onProgress?: (progress: UploadProgress) => void,
): Promise<UploadResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress({
          loaded: e.loaded,
          total: e.total,
          progress: Math.round((e.loaded / e.total) * 100),
        });
      }
    };

    reader.onload = () => {
      const dataUrl = reader.result as string;
      resolve({
        url: dataUrl,
        key: `demo-${Date.now()}-${file.name}`,
        size: file.size,
        mimeType: file.type,
      });
      logger.info('Image uploaded (demo)', { size: file.size, type: file.type });
    };

    reader.readAsDataURL(file);
  });
}

// ---------------------------------------------------------------------------
// Production: upload to S3 with presigned URL
// ---------------------------------------------------------------------------

async function uploadToS3(
  file: File,
  uploadUrl: string,
  onProgress?: (progress: UploadProgress) => void,
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    if (onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          onProgress({
            loaded: e.loaded,
            total: e.total,
            progress: Math.round((e.loaded / e.total) * 100),
          });
        }
      });
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const response = JSON.parse(xhr.responseText);
        resolve({
          url: response.url,
          key: response.key,
          size: file.size,
          mimeType: file.type,
        });
        logger.info('Image uploaded to S3', { key: response.key, size: file.size });
      } else {
        reject(new Error(`Upload failed: ${xhr.statusText}`));
      }
    };

    xhr.onerror = () => reject(new Error('Upload failed'));

    const formData = new FormData();
    formData.append('file', file);
    xhr.open('POST', uploadUrl);
    xhr.send(formData);
  });
}
