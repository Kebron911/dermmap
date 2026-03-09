import { logger } from './logger';
import { db } from './db';

// ---------------------------------------------------------------------------
// Image Service — captures photos and stores them in IndexedDB as base64.
// In production this would upload to S3/Azure Blob and store the URL.
// ---------------------------------------------------------------------------

export interface StoredImage {
  id: string;
  blob: string;      // base64 data URI
  mimeType: string;
}

export const imageService = {
  /**
   * Capture a photo from a file input or blob and store it locally.
   */
  async storeFromFile(file: File): Promise<StoredImage> {
    const id = `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const dataUrl = await readFileAsDataURL(file);
    const image: StoredImage = { id, blob: dataUrl, mimeType: file.type };
    await db.images.put(image);
    logger.info('Image stored', { id, size: file.size, type: file.type });
    return image;
  },

  async storeFromDataUrl(dataUrl: string, mimeType = 'image/jpeg'): Promise<StoredImage> {
    const id = `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const image: StoredImage = { id, blob: dataUrl, mimeType };
    await db.images.put(image);
    return image;
  },

  async get(id: string): Promise<StoredImage | undefined> {
    return db.images.get(id);
  },

  async delete(id: string): Promise<void> {
    await db.images.delete(id);
  },
};

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
