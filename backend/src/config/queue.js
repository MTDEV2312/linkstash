import inProcessQueue from '../services/scraperQueue.js';
import mongoose from 'mongoose';

let backend = {
  mode: 'inprocess',
  addJob: async (data, opts = {}) => {
    // default fallback before init
    inProcessQueue.addJob(data, opts);
    return { id: 'inproc-' + Date.now() };
  },
  getStats: async () => ({ queued: inProcessQueue.stats().queued, running: inProcessQueue.stats().running })
};

let _initPromise = null;

const init = async () => {
  if (_initPromise) return _initPromise;
  _initPromise = (async () => {
    // Detectar si hay configuración de Redis (URL de Upstash o host tradicional)
    const hasRedisUrl = !!(process.env.REDIS_URL && process.env.REDIS_URL.length > 0);
    const hasRedisHost = !!(process.env.REDIS_HOST && process.env.REDIS_HOST.length > 0);
    const useRedis = (hasRedisUrl || hasRedisHost) && process.env.ENABLE_BULLMQ !== 'false';
    
    if (!useRedis) {
      console.log('[Queue] Usando cola in-process (no se detectó REDIS_URL ni REDIS_HOST)');
      backend = {
        mode: 'inprocess',
        addJob: async (data, opts = {}) => { inProcessQueue.addJob(data, opts); return { id: 'inproc-' + Date.now() }; },
        getStats: async () => inProcessQueue.stats()
      };
      return backend;
    }

    try {
      console.log('[Queue] Intentando inicializar BullMQ (Redis)...');
      const { Queue, Worker } = await import('bullmq');
      const IORedis = (await import('ioredis')).default;

      let connection;

      // Priorizar REDIS_URL (Upstash y otros servicios cloud)
      if (hasRedisUrl) {
        console.log('[Queue] Usando REDIS_URL para conexión (Upstash)');
        connection = new IORedis(process.env.REDIS_URL, {
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
          family: 0 // Usar IPv4 e IPv6
        });
      } else {
        // Fallback a configuración tradicional (Docker local, etc.)
        console.log('[Queue] Usando configuración tradicional (REDIS_HOST)');
        const redisConfig = {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379', 10),
          maxRetriesPerRequest: null
        };

        if (process.env.REDIS_PASSWORD) {
          redisConfig.password = process.env.REDIS_PASSWORD;
        }

        if (process.env.REDIS_TLS === 'true') {
          redisConfig.tls = {};
        }

        connection = new IORedis(redisConfig);
      }

      const scraperQueue = new Queue('scraper', { connection });

      const worker = new Worker(
        'scraper',
        async (job) => {
          const scraperService = (await import('../services/scraperService.js')).default;
          const Link = (await import('../models/Link.js')).default;
          const cloudinaryService = (await import('../services/cloudinaryService.js')).default;
          const { getNextDefaultImage } = await import('../config/defaults.js');

          const { linkId, url, userId } = job.data || {};
          if (!linkId || !url) throw new Error('Invalid job payload');

          await Link.findByIdAndUpdate(linkId, { $inc: { scrapingAttempts: 1 }, status: 'processing' });

          const scrapingResult = await scraperService.scrapeUrl(url);

          if (scrapingResult && scrapingResult.success) {
            const scraped = scrapingResult.data || {};
            const updates = { title: scraped.title || undefined, description: scraped.description || undefined, status: 'completed', scrapingError: null };

            const scrapedImage = scraped.image || '';
            if (scrapedImage) {
              try {
                const up = await cloudinaryService.uploadImageFromUrl(scrapedImage);
                if (up && up.success) {
                  updates.image = up.url; updates.imagePublicId = up.public_id; updates.imageIsCloudinary = true;
                } else {
                  updates.image = scrapedImage; updates.imagePublicId = ''; updates.imageIsCloudinary = false;
                }
              } catch (e) {
                updates.image = scrapedImage; updates.imagePublicId = ''; updates.imageIsCloudinary = false;
              }
            } else {
              const defaultImg = process.env.DEFAULT_IMAGE_URL || getNextDefaultImage();
              if (defaultImg) updates.image = defaultImg;
            }

            await Link.findByIdAndUpdate(linkId, updates, { new: true });
            return { success: true };
          } else {
            const errMsg = scrapingResult && scrapingResult.error ? scrapingResult.error : 'Scraping failed';
            await Link.findByIdAndUpdate(linkId, { status: 'failed', scrapingError: errMsg });
            throw new Error(errMsg);
          }
        },
        {
          connection,
          concurrency: parseInt(process.env.SCRAPER_QUEUE_CONCURRENCY || '5', 10),
          limiter: {
            max: parseInt(process.env.SCRAPER_QUEUE_RATE_MAX || '10', 10),
            duration: parseInt(process.env.SCRAPER_QUEUE_RATE_DURATION_MS || '1000', 10)
          }
        }
      );

      worker.on('completed', (job) => console.log('[BullMQ] Job completed', job.id));
      worker.on('failed', (job, err) => console.error('[BullMQ] Job failed', job && job.id, err && err.message));

      backend = {
        mode: 'bull',
        addJob: async (data, opts = {}) => {
          const attempts = opts.maxAttempts || opts.attempts || 3;
          const backoffDelay = opts.backoff || 2000;
          return await scraperQueue.add('scrape', data, {
            attempts,
            backoff: { type: 'exponential', delay: backoffDelay },
            removeOnComplete: true,
            removeOnFail: false
          });
        },
        getStats: async () => {
          try {
            return await scraperQueue.getJobCounts();
          } catch (e) {
            return { error: e.message };
          }
        }
      };

      console.log('[Queue] BullMQ inicializada correctamente');
      return backend;
    } catch (err) {
      console.error('No se pudo inicializar BullMQ, fallback a in-process queue:', err);
      backend = {
        mode: 'inprocess',
        addJob: async (data, opts = {}) => { inProcessQueue.addJob(data, opts); return { id: 'inproc-' + Date.now() }; },
        getStats: async () => inProcessQueue.stats()
      };
      return backend;
    }
  })();
  return _initPromise;
};

// Iniciar inicialización en background
init().catch(err => console.error('Error inicializando queue:', err));

export default {
  addJob: async (data, opts = {}) => {
    await init();
    return backend.addJob(data, opts);
  },
  getStats: async () => {
    await init();
    return backend.getStats();
  },
  mode: () => backend.mode
};
