import scraperQueue from './scraperQueue.js';
import scraperService from './scraperService.js';
import Link from '../models/Link.js';
import cloudinaryService from './cloudinaryService.js';
import { getNextDefaultImageWithCloudinary } from '../config/defaults.js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('ScraperWorker');

const resolveDefaultImage = async () => {
  const fallback = await getNextDefaultImageWithCloudinary();
  let url = fallback.url || '';
  let isCloudinary = fallback.isCloudinary;
  let publicId = fallback.publicId || '';

  if (url && url.startsWith('/')) {
    const backendUrl = process.env.BACKEND_BASE_URL || 'http://localhost:5000';
    url = `${backendUrl.replace(/\/$/, '')}${url}`;
    isCloudinary = false;
    publicId = '';
  }

  return { url, isCloudinary, publicId };
};

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

    logger.info(`Procesando scraping para ${linkId}`, { url, jobId: job.id });

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
        const fallback = await resolveDefaultImage();
        if (fallback.url) {
          updates.image = fallback.url;
          updates.imagePublicId = fallback.publicId;
          updates.imageIsCloudinary = fallback.isCloudinary;
        }
      }

      // Aplicar actualizaciones
      await Link.findByIdAndUpdate(linkId, updates, { new: true });
      logger.info(`Scraping completado para ${linkId}`);
      return true;
    } else {
      // Scraping falló, pero NO marcar como failed - usar valores predeterminados
      const errMsg = scrapingResult && scrapingResult.error ? scrapingResult.error : 'Scraping failed';
      const errType = scrapingResult && scrapingResult.errorType ? scrapingResult.errorType : null;
      
      logger.warn(`Scraping falló para ${linkId}, usando valores predeterminados`, { error: errMsg, errorType: errType });
      
      // Obtener imagen predeterminada
      const fallback = await resolveDefaultImage();
      
      // Actualizar con valores predeterminados y marcar como completado
      const updates = {
        status: 'completed',
        scrapingError: errMsg,
        scrapingErrorType: errType,
        needsDescription: true, // IMPORTANTE: Marcar que necesita descripción manual
        // Asegurar que si el scraping falló, el campo image no se quede vacio si no tiene valor previo
      };
      
      // Obtener imagen predeterminada si no tenemos imagen
      const currentLink = await Link.findById(linkId);
      if (!currentLink.image || currentLink.image === '') {
        if (fallback.url) {
          updates.image = fallback.url;
          updates.imagePublicId = fallback.publicId;
          updates.imageIsCloudinary = fallback.isCloudinary;
        }
      }
      
      await Link.findByIdAndUpdate(linkId, updates, { new: true });
      
      // Retornar true para no reintentar
      return true;
    }
  } catch (err) {
    // Si hay un error crítico, registrarlo pero marcar el link como completado con predeterminados
    logger.error(`Error procesando job ${job.id} para link ${linkId}`, err);
    
    try {
      const fallback = await resolveDefaultImage();
      const currentLink = await Link.findById(linkId);
      
      const updates = {
        status: 'completed',
        scrapingError: err.message || 'Error interno',
        scrapingErrorType: null,
        needsDescription: true // IMPORTANTE: Marcar que necesita descripción manual
      };
      
      if (!currentLink.image || currentLink.image === '') {
        if (fallback.url) {
          updates.image = fallback.url;
          updates.imagePublicId = fallback.publicId;
          updates.imageIsCloudinary = fallback.isCloudinary;
        }
      }
      
      await Link.findByIdAndUpdate(linkId, updates, { new: true });
      logger.info(`Link ${linkId} marcado como completado con valores predeterminados tras error`);
      
      // Retornar true para evitar reintentos
      return true;
    } catch (updateErr) {
      logger.error(`Error crítico actualizando link ${linkId}`, updateErr);
      throw err;
    }
  }
};

// Registrar el processor en la cola
try {
  scraperQueue.process(processJob);

  // Registrar event listeners para logging/observabilidad
  scraperQueue.on('enqueued', (job) => logger.debug('Job enqueued', { jobId: job.id }));
  scraperQueue.on('processing', (job) => logger.debug('Job processing', { jobId: job.id }));
  scraperQueue.on('completed', (job) => logger.info('Job completed', { jobId: job.id }));
  scraperQueue.on('failed', (job, err) => logger.warn('Job failed', { jobId: job.id, error: err?.message }));
  scraperQueue.on('requeued', (job) => logger.info('Job requeued', { jobId: job.id, attempts: job.attempts }));
  scraperQueue.on('exhausted', async (job, err) => {
    logger.error('Job exhausted', err, { jobId: job.id });
    // Si el job se agotó, marcar link como completado con valores predeterminados
    try {
      const linkId = job.data && job.data.linkId;
      if (linkId) {
        const fallback = await resolveDefaultImage();
        const currentLink = await Link.findById(linkId);
        
        const updates = {
          status: 'completed',
          scrapingError: err && err.message || 'Job agotado',
          scrapingErrorType: null
        };
        
        if (!currentLink.image || currentLink.image === '') {
          if (fallback.url) {
            updates.image = fallback.url;
            updates.imagePublicId = fallback.publicId;
            updates.imageIsCloudinary = fallback.isCloudinary;
          }
        }
        
        await Link.findByIdAndUpdate(linkId, updates);
        logger.info(`Link ${linkId} marcado como completado tras agotamiento`);
      }
    } catch (e) {
      logger.error('Error marcando link como completado tras agotamiento', e);
    }
  });

  logger.info('Scraper worker (in-process) iniciado');
} catch (e) {
  logger.error('No se pudo iniciar scraperWorker', e);
}

export default { processJob };
