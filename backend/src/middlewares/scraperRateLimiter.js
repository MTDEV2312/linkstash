import rateLimit from 'express-rate-limit';

// Simple rate limiter middleware for scraping endpoints.
// Configure via environment variables:
// SCRAPER_RATE_WINDOW_MS, SCRAPER_RATE_MAX
export default rateLimit({
  windowMs: parseInt(process.env.SCRAPER_RATE_WINDOW_MS || String(60 * 1000), 10), // 1 minute
  max: parseInt(process.env.SCRAPER_RATE_MAX || '10', 10), // limit each IP to 10 requests per windowMs
  message: { error: 'Too many scrape requests, please slow down' }
});
