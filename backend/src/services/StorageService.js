import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabaseAdmin } from '../config/supabase.js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('ImageStorageService');

const env = process.env;
const defaultBucket = env.SUPABASE_STORAGE_BUCKET || 'images';

const sanitizePathSegment = (str = '') => {
  return String(str).replace(/[^a-zA-Z0-9_\-]/g, '_');
};

const inferExtension = (mimeType = '') => {
  const map = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/avif': 'avif',
    'image/bmp': 'bmp',
    'image/tiff': 'tiff',
    'image/x-icon': 'ico',
    'image/gif': 'gif',
    'image/svg+xml': 'svg'
  };
  return map[mimeType.toLowerCase()] || 'jpg';
};

const buildObjectKey = (options = {}) => {
  if (options.key) {
    return options.key.replace(/^\/+|\/+$/g, '');
  }

  const ext = options.extension || inferExtension(options.mimeType);
  const safeExt = ext.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'jpg';
  const timestamp = Date.now();

  const userId = options.userId ? sanitizePathSegment(options.userId) : null;
  const linkId = options.linkId ? sanitizePathSegment(options.linkId) : null;

  if (userId && linkId) {
    return `previews/${userId}/${linkId}-${timestamp}.${safeExt}`;
  }

  if (userId && (options.isAvatar || options.type === 'avatar' || options.folder === 'avatars')) {
    return `avatars/${userId}-${timestamp}.${safeExt}`;
  }

  if (userId) {
    return `previews/${userId}/${timestamp}.${safeExt}`;
  }

  const folder = options.folder ? options.folder.replace(/^\/+|\/+$/g, '') : 'previews/anonymous';
  const random = Math.random().toString(36).slice(2, 10);
  return `${folder}/${timestamp}-${random}.${safeExt}`;
};

const extractObjectKeyFromUrl = (url, bucketName = defaultBucket) => {
  if (!url || typeof url !== 'string') return '';

  const supabaseMarker = `/storage/v1/object/public/${bucketName}/`;
  const subIdx = url.indexOf(supabaseMarker);
  if (subIdx >= 0) {
    return decodeURIComponent(url.slice(subIdx + supabaseMarker.length));
  }

  const genericSupabaseMarker = `/storage/v1/object/public/`;
  const genIdx = url.indexOf(genericSupabaseMarker);
  if (genIdx >= 0) {
    const afterMarker = url.slice(genIdx + genericSupabaseMarker.length);
    const parts = afterMarker.split('/');
    parts.shift();
    return decodeURIComponent(parts.join('/'));
  }

  const insforgeMarker = `/storage/buckets/${bucketName}/objects/`;
  const insIdx = url.indexOf(insforgeMarker);
  if (insIdx >= 0) {
    return decodeURIComponent(url.slice(insIdx + insforgeMarker.length));
  }

  if (/^https?:\/\//i.test(url)) {
    try {
      const parsed = new URL(url);
      const parts = parsed.pathname.split('/').filter(Boolean);
      const pubIdx = parts.indexOf('public');
      if (pubIdx >= 0 && pubIdx + 2 < parts.length) {
        return decodeURIComponent(parts.slice(pubIdx + 2).join('/'));
      }
      return decodeURIComponent(parsed.pathname.replace(/^\/+/, ''));
    } catch (e) {
      // Fall through
    }
  }

  return url.replace(/^\/+|\/+$/g, '');
};

const getPublicUrl = (objectKey, options = {}) => {
  const bucket = options.bucket || env.SUPABASE_STORAGE_BUCKET || defaultBucket;
  if (!objectKey) return '';
  if (/^https?:\/\//i.test(objectKey)) return objectKey;

  const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(objectKey);
  if (data?.publicUrl) {
    return data.publicUrl;
  }

  const baseUrl = env.SUPABASE_URL || 'http://localhost:8000';
  return `${baseUrl.replace(/\/$/, '')}/storage/v1/object/public/${bucket}/${objectKey}`;
};

const uploadImageFromBuffer = async (buffer, options = {}) => {
  try {
    const bucket = options.bucket || env.SUPABASE_STORAGE_BUCKET || defaultBucket;
    const objectKey = buildObjectKey(options);
    const mimeType = options.mimeType || 'image/jpeg';

    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(objectKey, buffer, {
        contentType: mimeType,
        upsert: true
      });

    if (error) {
      logger.error('Supabase Storage upload error', error, { objectKey, bucket });
      throw error;
    }

    const publicUrl = getPublicUrl(objectKey, { bucket });
    return {
      success: true,
      url: publicUrl,
      public_id: objectKey,
      key: objectKey,
      raw: data
    };
  } catch (err) {
    logger.error('Storage uploadFromBuffer error', err);
    return { success: false, error: err };
  }
};

const uploadImageFromUrl = async (imageUrl, options = {}) => {
  let originalRelativePath = '';
  try {
    if (typeof imageUrl === 'string' && imageUrl.startsWith('/')) {
      originalRelativePath = imageUrl;
      const base = process.env.BACKEND_BASE_URL || '';
      if (base) {
        try {
          const parsedBase = new URL(base);
          const isLocalBase = parsedBase.hostname === 'localhost' || parsedBase.hostname === '127.0.0.1';
          if (!isLocalBase) {
            imageUrl = `${base.replace(/\/$/, '')}${imageUrl}`;
          }
        } catch (e) {
          imageUrl = `${base.replace(/\/$/, '')}${imageUrl}`;
        }
      }

      if (imageUrl.startsWith('/')) {
        try {
          const __filename = fileURLToPath(import.meta.url);
          const __dirname = path.dirname(__filename);
          const parts = imageUrl.split('/').filter(Boolean);
          const filename = parts[parts.length - 1];
          const localPath = path.join(__dirname, '..', '..', 'public', 'defaults', filename);
          const stat = await fs.stat(localPath).catch(() => null);
          if (stat) {
            const buffer = await fs.readFile(localPath);
            const ext = filename?.split('.').pop()?.toLowerCase() || 'jpg';
            return await uploadImageFromBuffer(buffer, {
              ...options,
              extension: ext
            });
          }
        } catch (e) {
          // Ignore local file error and proceed to HTTP fetch or fallback
        }
        const err = new Error('Local path provided and could not be uploaded (no BACKEND_BASE_URL and local file not found)');
        logger.error('Storage uploadFromUrl error: local path unresolved', err, { imageUrl });
        return { success: false, error: err };
      }
    }

    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image from URL (${response.status})`);
    }

    const mimeType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = Buffer.from(await response.arrayBuffer());

    return await uploadImageFromBuffer(buffer, {
      ...options,
      mimeType,
      extension: options.extension || inferExtension(mimeType)
    });
  } catch (err) {
    if (originalRelativePath && /^\/defaults\//i.test(originalRelativePath)) {
      try {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const filename = originalRelativePath.split('/').filter(Boolean).pop();
        const localPath = path.join(__dirname, '..', '..', 'public', 'defaults', filename);
        const localBuffer = await fs.readFile(localPath);
        const ext = filename?.split('.').pop()?.toLowerCase() || 'jpg';
        return await uploadImageFromBuffer(localBuffer, {
          ...options,
          extension: ext
        });
      } catch (fallbackErr) {
        logger.error('Storage uploadFromUrl local fallback error', fallbackErr, { imageUrl: originalRelativePath });
      }
    }

    logger.error('Storage uploadFromUrl error', err, { imageUrl });
    return { success: false, error: err };
  }
};

const deleteImage = async (publicId, options = {}) => {
  try {
    if (!publicId) return { success: false, message: 'public_id required' };
    const bucket = options.bucket || env.SUPABASE_STORAGE_BUCKET || defaultBucket;

    const objectKey = extractObjectKeyFromUrl(publicId, bucket);
    if (!objectKey) return { success: false, message: 'Could not extract object key' };

    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .remove([objectKey]);

    if (error) {
      logger.error('Supabase Storage deleteImage error', error, { objectKey, bucket });
      throw error;
    }

    return { success: true, raw: data };
  } catch (err) {
    logger.error('Storage deleteImage error', err, { publicId });
    return { success: false, error: err };
  }
};

export default {
  buildObjectKey,
  extractObjectKeyFromUrl,
  getPublicUrl,
  uploadImageFromUrl,
  uploadImageFromBuffer,
  deleteImage
};
