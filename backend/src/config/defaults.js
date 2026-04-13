import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import storageService from '../services/StorageService.js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('Defaults');

// __dirname para ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carpeta pública donde deben estar las imágenes por defecto
const publicDefaultsDir = path.join(__dirname, '..', '..', 'public', 'defaults');

// Estrategia: 'random' o 'roundrobin'
const strategy = (process.env.DEFAULT_IMAGE_STRATEGY || 'random').toLowerCase();

const isValidDefaultImageUrl = (url) => /^(https?:\/\/.+|\/[\S].*)$/i.test(url || '');

const configuredDefaultImages = (process.env.DEFAULT_IMAGE_URLS || '')
  .split(',')
  .map((u) => u.trim())
  .filter((u) => isValidDefaultImageUrl(u));

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

const storageCache = new Map();

const hasStorageConfig = () => {
  return !!(
    process.env.INSFORGE_URL ||
    process.env.INSFORGE_BASE_URL
  );
};

const isLegacyCloudinaryUrl = (url) => {
  return typeof url === 'string' && url.includes('res.cloudinary.com');
};

const isInsforgeStorageUrl = (url) => {
  return typeof url === 'string' && /\/storage\/buckets\/[^/]+\/objects\//i.test(url);
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
  if (configuredDefaultImages.length > 0) {
    return configuredDefaultImages.slice();
  }
  return defaultImages.slice();
}

export function getNextDefaultImage() {
  const pool = configuredDefaultImages.length > 0 ? configuredDefaultImages : defaultImages;

  if (!pool || pool.length === 0) {
    // Fallback conservador
    if (process.env.DEFAULT_IMAGE_URL) return process.env.DEFAULT_IMAGE_URL;
    return '/defaults/default-image.svg';
  }

  if (strategy === 'roundrobin') {
    const idx = roundRobinIndex % pool.length;
    roundRobinIndex += 1;
    return pool[idx];
  }

  // Por defecto random
  const idx = Math.floor(Math.random() * pool.length);
  return pool[idx];
}

export async function getNextDefaultImageWithStorage() {
  const envDefaultRaw = (process.env.DEFAULT_IMAGE_URL || '').trim();
  const envDefaultLooksValid = /^(https?:\/\/.+|\/[\S].*)$/i.test(envDefaultRaw);
  const rawImage = envDefaultLooksValid ? envDefaultRaw : getNextDefaultImage();
  if (!rawImage) {
    return { url: '', publicId: '', isStored: false };
  }

  if (storageCache.has(rawImage)) {
    return storageCache.get(rawImage);
  }

  if (isLegacyCloudinaryUrl(rawImage) || isInsforgeStorageUrl(rawImage)) {
    const cached = { url: rawImage, publicId: '', isStored: false };
    storageCache.set(rawImage, cached);
    return cached;
  }

  if (!hasStorageConfig()) {
    const fallback = { url: rawImage, publicId: '', isStored: false };
    storageCache.set(rawImage, fallback);
    return fallback;
  }

  try {
    const folderBase = process.env.INSFORGE_STORAGE_FOLDER || 'linkstash';
    let uploadSource = rawImage;
    if (isLocalhostDefaultsUrl(rawImage)) {
      const parsed = new URL(rawImage);
      const parts = parsed.pathname.split('/').filter(Boolean);
      const filename = parts[parts.length - 1];
      uploadSource = `/defaults/${filename}`;
    }

    const up = await storageService.uploadImageFromUrl(uploadSource, { folder: `${folderBase}/defaults` });
    if (up && up.success) {
      const result = { url: up.url, publicId: up.public_id || '', isStored: true };
      storageCache.set(rawImage, result);
      return result;
    }
  } catch (e) {
    // Fall through to fallback
    logger.warn('Error subiendo imagen por defecto a InsForge Storage', { error: e.message, rawImage });
  }

  const fallback = { url: rawImage, publicId: '', isStored: false };
  storageCache.set(rawImage, fallback);
  return fallback;
}

export default {
  getDefaultImages,
  getNextDefaultImage,
  getNextDefaultImageWithStorage
};
