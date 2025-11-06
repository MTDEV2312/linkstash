import scraperProvider from '../src/services/scraperProviderService.js';

const urls = [
  'https://ebds.online/',
  'https://example.com/',
  'https://google.com/',
  'http://127.0.0.1/',
  'http://169.254.169.254/',
  'http://192.168.1.10/'
];

async function run() {
  console.log('SCRAPER_PROVIDER:', process.env.SCRAPER_PROVIDER || 'local');
  console.log('SCRAPER_ALLOW_PUBLIC:', process.env.SCRAPER_ALLOW_PUBLIC || 'undefined');
  for (const url of urls) {
    console.log('\n---');
    console.log('URL:', url);
    try {
      const res = await scraperProvider.scrapeUrl(url);
      console.log('Result:', JSON.stringify(res && (typeof res === 'object' ? res : { result: res }), null, 2));
    } catch (e) {
      console.error('Error:', e && e.message ? e.message : e);
    }
  }
}

run().catch(e => {
  console.error('Test runner error:', e);
  process.exit(1);
});
