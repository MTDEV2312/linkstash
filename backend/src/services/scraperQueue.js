import EventEmitter from 'events';

// Job descriptor: { id, data, attempts, maxAttempts, backoff }
class InProcessQueue extends EventEmitter {
  constructor({ concurrency = 3 } = {}) {
    super();
    this.concurrency = concurrency;
    this.running = 0;
    this.queue = [];
    this._jobId = 1;
    this.processor = null; // function to process job.data
  }

  // Registrar el handler que procesará jobs
  process(handler) {
    if (typeof handler !== 'function') throw new Error('processor must be a function');
    this.processor = handler;
    // Intentar comenzar a procesar si hay jobs pendientes
    setImmediate(() => this._next());
  }

  // Añadir job al final de la cola
  addJob(data, opts = {}) {
    const job = {
      id: String(this._jobId++),
      data,
      attempts: opts.attempts || 0,
      maxAttempts: opts.maxAttempts || parseInt(process.env.SCRAPER_JOB_MAX_ATTEMPTS || '3', 10),
      backoff: opts.backoff || parseInt(process.env.SCRAPER_JOB_BACKOFF_MS || '2000', 10),
      createdAt: Date.now()
    };

    this.queue.push(job);
    // Emitir evento para observabilidad (opcional)
    this.emit('enqueued', job);
    setImmediate(() => this._next());
    return job;
  }

  async _next() {
    if (!this.processor) return; // No hay worker registrado aún
    if (this.running >= this.concurrency) return;
    const job = this.queue.shift();
    if (!job) return;
    this.running++;
    try {
      this.emit('processing', job);
      await this.processor(job);
      this.emit('completed', job);
    } catch (err) {
      this.emit('failed', job, err);
      // Manejar reintentos con backoff exponencial
      job.attempts = (job.attempts || 0) + 1;
      if (job.attempts < job.maxAttempts) {
        const delay = job.backoff * Math.pow(2, job.attempts - 1);
        setTimeout(() => {
          // Re-enqueue
          this.queue.push(job);
          this.emit('requeued', job);
          setImmediate(() => this._next());
        }, delay);
      } else {
        // Exhausted attempts
        this.emit('exhausted', job, err);
      }
    } finally {
      this.running--;
      // Schedule next tick
      setImmediate(() => this._next());
    }
  }

  // Exponer estado para monitorización simple
  stats() {
    return { queued: this.queue.length, running: this.running };
  }
}

const inProcessQueue = new InProcessQueue({ concurrency: parseInt(process.env.SCRAPER_QUEUE_CONCURRENCY || '3', 10) });

export default inProcessQueue;
