import scraperQueue from './scraperQueue.js';
import scraperService from './scraperService.js';
import Link from '../models/Link.js';
import cloudinaryService from './cloudinaryService.js';
import { getNextDefaultImage } from '../config/defaults.js';

// Worker: procesa jobs con forma { data: { linkId, url, userId }, ... }
const processJob = async (job) => {
  const { data } = job;
  const { linkId, url, userId } = data || {};

  if (!linkId || !url) {
    throw new Error('Invalid job payload: missing linkId or url');
  }

  try {
    // Marcar intento (incrementar scrapingAttempts y asegurar status processing)
    await Link.findByIdAndUpdate(linkId, {
      $inc: { scrapingAttempts: 1 },
      status: 'processing'
    });

    console.log(`[Worker] Procesando scraping para ${linkId} -> ${url} (job ${job.id})`);

    const scrapingResult = await scraperService.scrapeUrl(url);

    if (scrapingResult && scrapingResult.success) {
      const scraped = scrapingResult.data || {};

      const updates = {
        title: scraped.title || undefined,
        description: scraped.description || undefined,
        status: 'completed',
        scrapingError: null
      };

      // Manejo de imagen
      const scrapedImage = scraped.image || '';
      if (scrapedImage) {
        try {
          const up = await cloudinaryService.uploadImageFromUrl(scrapedImage);
          if (up && up.success) {
            updates.image = up.url;
            updates.imagePublicId = up.public_id;
            updates.imageIsCloudinary = true;
          } else {
            updates.image = scrapedImage;
            updates.imagePublicId = '';
            updates.imageIsCloudinary = false;
          }
        } catch (e) {
          updates.image = scrapedImage;
          updates.imagePublicId = '';
          updates.imageIsCloudinary = false;
        }
      } else {
        const defaultImg = process.env.DEFAULT_IMAGE_URL || getNextDefaultImage();
        if (defaultImg) updates.image = defaultImg;
      }

      // Aplicar actualizaciones
      await Link.findByIdAndUpdate(linkId, updates, { new: true });
      console.log(`[Worker] Scraping completado para ${linkId}`);
      return true;
    } else {
      const errMsg = scrapingResult && scrapingResult.error ? scrapingResult.error : 'Scraping failed';
      await Link.findByIdAndUpdate(linkId, {
        status: 'failed',
        scrapingError: errMsg
      });
      console.error(`[Worker] Scraping falló para ${linkId}: ${errMsg}`);
      throw new Error(errMsg);
    }
  } catch (err) {
    // El worker lanza el error para que la cola pueda reintentar
    console.error(`[Worker] Error procesando job ${job.id} para link ${linkId}:`, err.message || err);
    throw err;
  }
};

// Registrar el processor en la cola
try {
  scraperQueue.process(processJob);

  // Registrar event listeners para logging/observabilidad
  scraperQueue.on('enqueued', (job) => console.log('[Queue] enqueued', job.id));
  scraperQueue.on('processing', (job) => console.log('[Queue] processing', job.id));
  scraperQueue.on('completed', (job) => console.log('[Queue] completed', job.id));
  scraperQueue.on('failed', (job, err) => console.warn('[Queue] failed', job.id, err && err.message));
  scraperQueue.on('requeued', (job) => console.log('[Queue] requeued', job.id, 'attempts=', job.attempts));
  scraperQueue.on('exhausted', async (job, err) => {
    console.error('[Queue] exhausted job', job.id, 'error=', err && err.message);
    // Si el job se agotó, marcar link como failed definitivamente
    try {
      const linkId = job.data && job.data.linkId;
      if (linkId) {
        await Link.findByIdAndUpdate(linkId, { status: 'failed', scrapingError: err && err.message });
      }
    } catch (e) {
      console.error('Error marcando link como failed tras agotamiento:', e);
    }
  });

  console.log('[Worker] Scraper worker (in-process) iniciado');
} catch (e) {
  console.error('No se pudo iniciar scraperWorker:', e);
}

export default { processJob };
