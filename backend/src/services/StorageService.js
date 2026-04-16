import { createClient } from '@insforge/sdk';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('ImageStorageService');

const env = process.env;
const defaultBucket = env.INSFORGE_STORAGE_BUCKET || 'images';
const defaultFolder = env.INSFORGE_STORAGE_FOLDER || 'linkstash';

let insforgeClient = null;

const getInsforgeClient = () => {
  if (insforgeClient) return insforgeClient;

  const baseUrl = env.INSFORGE_URL || env.INSFORGE_BASE_URL;
  if (!baseUrl) {
    throw new Error('INSFORGE_URL (o INSFORGE_BASE_URL) no está configurado');
  }

  const anonKey = env.INSFORGE_ANON_KEY;
  insforgeClient = createClient(
    anonKey
      ? { baseUrl, anonKey }
      : { baseUrl }
  );

  return insforgeClient;
};

const buildObjectKey = (options = {}) => {
  const folder = options.folder || defaultFolder;
  const ext = options.extension || 'jpg';
  const safeExt = ext.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'jpg';
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 10);
  const file = `${timestamp}-${random}.${safeExt}`;
  return `${folder.replace(/^\/+|\/+$/g, '')}/${file}`;
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

const extractObjectKeyFromUrl = (url, bucketName) => {
  if (!url || typeof url !== 'string') return '';
  const marker = `/storage/buckets/${bucketName}/objects/`;
  const idx = url.indexOf(marker);
  if (idx < 0) return '';
  return decodeURIComponent(url.slice(idx + marker.length));
};

const uploadBlobToInsforge = async (blob, options = {}) => {
  const bucket = options.bucket || defaultBucket;
  const objectKey = options.key || buildObjectKey(options);
  const client = getInsforgeClient();

  const { data, error } = await client.storage.from(bucket).upload(objectKey, blob);
  if (error) {
    const fallback = await client.storage.from(bucket).uploadAuto(blob);
    if (fallback.error) {
      throw fallback.error;
    }
    const url = fallback.data?.url || '';
    const key = fallback.data?.key || fallback.data?.objectKey || extractObjectKeyFromUrl(url, bucket);
    return { url, key, raw: fallback.data };
  }

  const url = data?.url || client.storage.from(bucket).getPublicUrl(objectKey);
  return { url, key: objectKey, raw: data };
};

const uploadImageFromUrl = async (imageUrl, options = {}) => {
  let originalRelativePath = '';
  try {
    // Si se pasa una ruta relativa del servidor (p.ej. /defaults/...),
    // intentar convertirla a URL absoluta usando BACKEND_BASE_URL si está configurada.
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
      } else {
        // Intentar localizar el fichero en disco dentro de public/defaults y subirlo desde buffer
        try {
          const __filename = fileURLToPath(import.meta.url);
          const __dirname = path.dirname(__filename);
          // Suponemos que los assets están en ../../public/defaults/<filename>
          const parts = imageUrl.split('/').filter(Boolean);
          const filename = parts[parts.length - 1];
          const localPath = path.join(__dirname, '..', '..', 'public', 'defaults', filename);
          const stat = await fs.stat(localPath).catch(() => null);
          if (stat) {
            const buffer = await fs.readFile(localPath);
            // Usar uploadImageFromBuffer para subir
            const up = await uploadImageFromBuffer(buffer, options);
            return up;
          }
        } catch (e) {
          // seguir al error de abajo si no encontramos o falló
        }
        const err = new Error('Local path provided and could not be uploaded (no BACKEND_BASE_URL and local file not found)');
        logger.error('Storage uploadFromUrl error: ruta local no resuelta', err, { imageUrl });
        return { success: false, error: err };
      }
    }
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`No se pudo descargar la imagen (${response.status})`);
    }

    const mimeType = response.headers.get('content-type') || '';
    const extension = inferExtension(mimeType);
    const buffer = Buffer.from(await response.arrayBuffer());
    const blob = new Blob([buffer], { type: mimeType || 'application/octet-stream' });

    const uploaded = await uploadBlobToInsforge(blob, { ...options, extension });
    return { success: true, url: uploaded.url, public_id: uploaded.key, raw: uploaded.raw };
  } catch (err) {
    // Si era una ruta relativa local y falló el fetch HTTP, intentar lectura local como fallback.
    if (originalRelativePath && /^\/defaults\//i.test(originalRelativePath)) {
      try {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const filename = originalRelativePath.split('/').filter(Boolean).pop();
        const localPath = path.join(__dirname, '..', '..', 'public', 'defaults', filename);
        const localBuffer = await fs.readFile(localPath);
        const ext = filename?.split('.').pop()?.toLowerCase() || 'jpg';
        const mimeByExt = {
          png: 'image/png',
          jpg: 'image/jpeg',
          jpeg: 'image/jpeg',
          webp: 'image/webp',
          avif: 'image/avif',
          bmp: 'image/bmp',
          tiff: 'image/tiff',
          ico: 'image/x-icon',
          gif: 'image/gif',
          svg: 'image/svg+xml'
        };
        return await uploadImageFromBuffer(localBuffer, {
          ...options,
          mimeType: mimeByExt[ext] || 'application/octet-stream',
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

const uploadImageFromBuffer = async (buffer, options = {}) => {
  try {
    const extension = options.extension || inferExtension(options.mimeType || '');
    const blob = new Blob([buffer], { type: options.mimeType || 'application/octet-stream' });
    const uploaded = await uploadBlobToInsforge(blob, { ...options, extension });
    return { success: true, url: uploaded.url, public_id: uploaded.key, raw: uploaded.raw };
  } catch (err) {
    logger.error('Storage uploadFromBuffer error', err);
    return { success: false, error: err };
  }
};

const deleteImage = async (publicId) => {
  try {
    if (!publicId) return { success: false, message: 'public_id required' };
    const bucket = env.INSFORGE_STORAGE_BUCKET || defaultBucket;
    const client = getInsforgeClient();

    let result = await client.storage.from(bucket).remove(publicId);
    if (result?.error) {
      result = await client.storage.from(bucket).remove([publicId]);
    }

    if (result?.error) {
      throw result.error;
    }

    return { success: true, raw: result?.data };
  } catch (err) {
    logger.error('Storage deleteImage error', err, { publicId });
    return { success: false, error: err };
  }
};

export default {
  uploadImageFromUrl,
  uploadImageFromBuffer,
  deleteImage
};
