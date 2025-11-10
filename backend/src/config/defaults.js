import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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
  defaultImages = [];
}

let roundRobinIndex = 0;

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

export default {
  getDefaultImages,
  getNextDefaultImage
};
