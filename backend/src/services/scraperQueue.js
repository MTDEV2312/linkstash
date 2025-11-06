import scraperService from './scraperService.js';

// Simple in-process scraper queue with concurrency limit.
// Not a production-grade distributed queue; useful as a drop-in example.
class ScraperQueue {
  constructor({ concurrency = 3 } = {}) {
    this.concurrency = concurrency;
    this.running = 0;
    this.queue = [];
  }

  enqueue(task) {
    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this._next();
    });
  }

  async _next() {
    if (this.running >= this.concurrency) return;
    const item = this.queue.shift();
    if (!item) return;
    this.running++;
    try {
      const result = await item.task();
      item.resolve(result);
    } catch (err) {
      item.reject(err);
    } finally {
      this.running--;
      // Process next in queue
      setImmediate(() => this._next());
    }
  }

  // Helper to enqueue a scrape job
  scrape(url) {
    return this.enqueue(() => scraperService.scrapeUrl(url));
  }
}

export default new ScraperQueue({ concurrency: parseInt(process.env.SCRAPER_QUEUE_CONCURRENCY || '3', 10) });
