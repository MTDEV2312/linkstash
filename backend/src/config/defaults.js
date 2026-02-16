import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import cloudinaryService from '../services/cloudinaryService.js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('Defaults');

// __dirname para ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carpeta pública donde deben estar las imágenes por defecto
const publicDefaultsDir = path.join(__dirname, '..', '..', 'public', 'defaults');

// Estrategia: 'random' o 'roundrobin'
const strategy = (process.env.DEFAULT_IMAGE_STRATEGY || 'random').toLowerCase();

let defaultImages = [];
try {
  const files = fs.readdirSync(publicDefaultsDir);
  defaultImages = files.filter(f => /\.(svg|png|jpe?g|webp|gif)$/i.test(f)).map(f => {
    if (process.env.BACKEND_BASE_URL) {
      return `${process.env.BACKEND_BASE_URL.replace(/\/$/, '')}/defaults/${f}`;
    }
    return `/defaults/${f}`;
  });
} catch (e) {
  // Si no existe la carpeta o falla, dejar array vacío
  logger.warn('No se pudieron cargar imágenes por defecto', { error: e.message, dir: publicDefaultsDir });
  defaultImages = [];
}

let roundRobinIndex = 0;

const cloudinaryCache = new Map();

const hasCloudinaryConfig = () => {
  return !!(
    process.env.CLOUDINARY_URL ||
    process.env.CLOUDINARY_CLOUD_NAME ||
    process.env.cloud_name ||
    process.env.CLOUDINARY_CLOUDNAME
  );
};

const isCloudinaryUrl = (url) => {
  return typeof url === 'string' && url.includes('res.cloudinary.com');
};

const isLocalhostDefaultsUrl = (url) => {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname;
    return (host === 'localhost' || host === '127.0.0.1') && parsed.pathname.includes('/defaults/');
  } catch (e) {
    return false;
  }
};

export function getDefaultImages() {
  return defaultImages.slice();
}

export function getNextDefaultImage() {
  if (!defaultImages || defaultImages.length === 0) {
    // Fallback conservador
    if (process.env.DEFAULT_IMAGE_URL) return process.env.DEFAULT_IMAGE_URL;
    return '/defaults/default-image.svg';
  }

  if (strategy === 'roundrobin') {
    const idx = roundRobinIndex % defaultImages.length;
    roundRobinIndex += 1;
    return defaultImages[idx];
  }

  // Por defecto random
  const idx = Math.floor(Math.random() * defaultImages.length);
  return defaultImages[idx];
}

export async function getNextDefaultImageWithCloudinary() {
  const rawImage = process.env.DEFAULT_IMAGE_URL || getNextDefaultImage();
  if (!rawImage) {
    return { url: '', publicId: '', isCloudinary: false };
  }

  if (cloudinaryCache.has(rawImage)) {
    return cloudinaryCache.get(rawImage);
  }

  if (isCloudinaryUrl(rawImage)) {
    const cached = { url: rawImage, publicId: '', isCloudinary: false };
    cloudinaryCache.set(rawImage, cached);
    return cached;
  }

  if (!hasCloudinaryConfig()) {
    const fallback = { url: rawImage, publicId: '', isCloudinary: false };
    cloudinaryCache.set(rawImage, fallback);
    return fallback;
  }

  try {
    const folderBase = process.env.CLOUDINARY_FOLDER || 'linkstash';
    let uploadSource = rawImage;
    if (isLocalhostDefaultsUrl(rawImage)) {
      const parsed = new URL(rawImage);
      const parts = parsed.pathname.split('/').filter(Boolean);
      const filename = parts[parts.length - 1];
      uploadSource = `/defaults/${filename}`;
    }

    const up = await cloudinaryService.uploadImageFromUrl(uploadSource, { folder: `${folderBase}/defaults` });
    if (up && up.success) {
      const result = { url: up.url, publicId: up.public_id || '', isCloudinary: true };
      cloudinaryCache.set(rawImage, result);
      return result;
    }
  } catch (e) {
    // Fall through to fallback
    logger.warn('Error subiendo imagen por defecto a Cloudinary', { error: e.message, rawImage });
  }

  const fallback = { url: rawImage, publicId: '', isCloudinary: false };
  cloudinaryCache.set(rawImage, fallback);
  return fallback;
}

export default {
  getDefaultImages,
  getNextDefaultImage,
  getNextDefaultImageWithCloudinary
};
