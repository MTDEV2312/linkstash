import dotenv from 'dotenv';
import scraperService from '../src/services/scraperService.js';

// Cargar .env del directorio 'backend'
dotenv.config({ path: './backend/.env', override: true });

(async function(){
  const url = 'https://www.mathiast.me/';
  console.log('Env SCRAPER_HOST_ALLOWLIST=', process.env.SCRAPER_HOST_ALLOWLIST);
  console.log('Env SCRAPER_ALLOW_PUBLIC=', process.env.SCRAPER_ALLOW_PUBLIC);
  const ok = await scraperService.isSafeUrl(url);
  console.log('isSafeUrl(', url, ') =>', ok);
})();
