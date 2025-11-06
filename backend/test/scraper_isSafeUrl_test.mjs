import scraperService from '../src/services/scraperService.js';

async function runTests() {
  const tests = [
    { url: 'https://example.com', expect: true },
    { url: 'http://example.com', expect: false },
    { url: 'http://localhost', expect: false },
    { url: 'http://127.0.0.1', expect: false },
    { url: 'http://192.168.1.1', expect: false },
    { url: 'ftp://example.com', expect: false },
    // Add an invalid host
    { url: 'http://nonexistent.invalid.local', expect: false }
  ];

  for (const t of tests) {
    try {
      const res = await scraperService.isSafeUrl(t.url);
      console.log(`${t.url} => ${res} (expected: ${t.expect})`);
    } catch (e) {
      console.log(`${t.url} => error (${e.message}) (expected: ${t.expect})`);
    }
  }
}

runTests().catch(e => {
  console.error('Test runner error:', e);
  process.exit(1);
});
