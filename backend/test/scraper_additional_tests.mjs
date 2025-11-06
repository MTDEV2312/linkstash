import assert from 'assert';
import cheerio from 'cheerio';
import scraperService from '../src/services/scraperService.js';
import dns from 'dns';

async function testObfuscatedAndMappedIps() {
  console.log('Running obfuscated/mapped IP tests...');

  const origResolve4 = dns.promises.resolve4;
  const origResolve6 = dns.promises.resolve6;

  try {
    dns.promises.resolve4 = async (host) => [];
    dns.promises.resolve6 = async (host) => [];

    // Decimal IP (2130706433 -> 127.0.0.1) should be rejected by looksLikeObfuscatedIp
    const obf = await scraperService.isSafeUrl('http://2130706433');
    assert.strictEqual(obf, false, 'Decimal obfuscated IP should be rejected');

    // Hex IP should be rejected as well
    const hex = await scraperService.isSafeUrl('http://0x7f000001');
    assert.strictEqual(hex, false, 'Hex obfuscated IP should be rejected');

    // IPv4-mapped IPv6 should be rejected
    const mapped = await scraperService.isSafeUrl('http://[::ffff:127.0.0.1]');
    assert.strictEqual(mapped, false, 'IPv4-mapped IPv6 should be rejected');

    console.log('obfuscated/mapped IP tests passed');
  } finally {
    dns.promises.resolve4 = origResolve4;
    dns.promises.resolve6 = origResolve6;
  }
}

async function testImageFaviconValidation() {
  console.log('Running image/favicon validation tests...');

  const origResolve4 = dns.promises.resolve4;
  const origResolve6 = dns.promises.resolve6;

  try {
    // example.com resolves to public IP; 127.0.0.1 resolves to private
    dns.promises.resolve4 = async (host) => {
      if (host === 'example.com') return ['93.184.216.34'];
      if (host === '127.0.0.1') return ['127.0.0.1'];
      return [];
    };
    dns.promises.resolve6 = async (host) => [];

    // Craft minimal HTML with og:image pointing to internal IP
    const $img = cheerio.load('<meta property="og:image" content="http://127.0.0.1/img.png">');
    const image = scraperService.extractImage($img, 'https://example.com');
    // image should be absolute (http://127.0.0.1/img.png)
    assert.ok(image.includes('127.0.0.1'), 'extractImage should return the internal URL');

    const safe = await scraperService.getSafeUrlInfo(image);
    assert.strictEqual(safe.ok, false, 'Internal image URL should be considered unsafe');

    // Favicon same idea
    const $fav = cheerio.load('<link rel="icon" href="http://127.0.0.1/favicon.ico">');
    const favicon = scraperService.extractFavicon($fav, 'https://example.com');
    assert.ok(favicon.includes('127.0.0.1'), 'extractFavicon should return the internal URL');
    const safeFav = await scraperService.getSafeUrlInfo(favicon);
    assert.strictEqual(safeFav.ok, false, 'Internal favicon URL should be considered unsafe');

    console.log('image/favicon validation tests passed');
  } finally {
    dns.promises.resolve4 = origResolve4;
    dns.promises.resolve6 = origResolve6;
  }
}

async function run() {
  await testObfuscatedAndMappedIps();
  await testImageFaviconValidation();
  console.log('Additional tests passed');
}

run().catch(err => {
  console.error('Additional tests failed:', err);
  process.exit(1);
});
