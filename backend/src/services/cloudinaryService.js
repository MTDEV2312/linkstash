import { v2 as cloudinary } from 'cloudinary';
import { PassThrough } from 'stream';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('CloudinaryService');

const env = process.env;
if (env.CLOUDINARY_URL) {
  cloudinary.config({ secure: true });
} else {
  const cloudName = env.CLOUDINARY_CLOUD_NAME
  const apiKey = env.CLOUDINARY_API_KEY
  const apiSecret = env.CLOUDINARY_API_SECRET
  if (cloudName && apiKey && apiSecret) {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true
    });
  }
}

const uploadImageFromUrl = async (imageUrl, options = {}) => {
  try {
    // Si se pasa una ruta relativa del servidor (p.ej. /defaults/...),
    // intentar convertirla a URL absoluta usando BACKEND_BASE_URL si está configurada.
    if (typeof imageUrl === 'string' && imageUrl.startsWith('/')) {
      const base = process.env.BACKEND_BASE_URL || '';
      if (base) {
        imageUrl = `${base.replace(/\/$/, '')}${imageUrl}`;
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
        logger.error('Cloudinary uploadFromUrl error: ruta local no resuelta', err, { imageUrl });
        return { success: false, error: err };
      }
    }
    // public_id can be auto-generated; allow folder option
    const uploadOpts = {
      folder: options.folder || process.env.CLOUDINARY_FOLDER || 'linkstash',
      overwrite: false,
      resource_type: 'image'
    };

    const result = await cloudinary.uploader.upload(imageUrl, uploadOpts);
    return { success: true, url: result.secure_url || result.url, public_id: result.public_id, raw: result };
  } catch (err) {
    logger.error('Cloudinary uploadFromUrl error', err, { imageUrl });
    return { success: false, error: err };
  }
};

const uploadImageFromBuffer = async (buffer, options = {}) => {
  try {
    const uploadOpts = {
      folder: options.folder || process.env.CLOUDINARY_FOLDER || 'linkstash',
      overwrite: false,
      resource_type: 'image'
    };

    return await new Promise((resolve) => {
      const stream = cloudinary.uploader.upload_stream(uploadOpts, (error, result) => {
        if (error) {
          logger.error('Cloudinary uploadFromBuffer error (stream)', error);
          return resolve({ success: false, error });
        }
        return resolve({ success: true, url: result.secure_url || result.url, public_id: result.public_id, raw: result });
      });

      const passthrough = new PassThrough();
      passthrough.end(buffer);
      passthrough.pipe(stream);
    });
  } catch (err) {
    logger.error('Cloudinary uploadFromBuffer error', err);
    return { success: false, error: err };
  }
};

const deleteImage = async (publicId) => {
  try {
    if (!publicId) return { success: false, message: 'public_id required' };
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
    // result.result === 'ok' or 'not found'
    return { success: true, raw: result };
  } catch (err) {
    logger.error('Cloudinary deleteImage error', err, { publicId });
    return { success: false, error: err };
  }
};

export default {
  uploadImageFromUrl,
  uploadImageFromBuffer,
  deleteImage
};
