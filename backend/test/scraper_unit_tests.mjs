import assert from 'assert';
import scraperService from '../src/services/scraperService.js';
import dns from 'dns';

async function testIsSafeUrl() {
  console.log('Running isSafeUrl tests...');

  const origResolve4 = dns.promises.resolve4;
  const origResolve6 = dns.promises.resolve6;

  try {
    // Mock: example.com -> public IPv4
    dns.promises.resolve4 = async (host) => {
      if (host === 'example.com') return ['93.184.216.34'];
      if (host === 'internal.test') return ['192.168.1.5'];
      return [];
    };
    dns.promises.resolve6 = async (host) => [];

    // HTTPS public should be allowed
    const ok = await scraperService.isSafeUrl('https://example.com');
    assert.strictEqual(ok, true, 'https://example.com should be allowed');

  // HTTP should be allowed (policy: aceptar http y https)
  const okHttp = await scraperService.isSafeUrl('http://example.com');
  assert.strictEqual(okHttp, true, 'http://example.com should be allowed (http is accepted)');

    // Private/internal host should be rejected
    const internal = await scraperService.isSafeUrl('https://internal.test');
    assert.strictEqual(internal, false, 'https://internal.test should be rejected (private IP)');

    // IP literal public vs private
    const ipPublic = await scraperService.isSafeUrl('https://93.184.216.34');
    assert.strictEqual(ipPublic, true, 'Public IP literal should be allowed');

    const ipPrivate = await scraperService.isSafeUrl('https://192.168.1.5');
    assert.strictEqual(ipPrivate, false, 'Private IP literal should be rejected');

    console.log('isSafeUrl tests passed');
  } finally {
    dns.promises.resolve4 = origResolve4;
    dns.promises.resolve6 = origResolve6;
  }
}

async function testResolveHostAndSelectIp() {
  console.log('Running resolveHostAndSelectIp tests...');

  const origResolve4 = dns.promises.resolve4;
  const origResolve6 = dns.promises.resolve6;

  try {
    dns.promises.resolve4 = async (host) => {
      if (host === 'example.com') return ['93.184.216.34'];
      if (host === 'v6only.test') return [];
      return [];
    };
    dns.promises.resolve6 = async (host) => {
      if (host === 'v6only.test') return ['2001:4860:4860::8888']; // public Google IPv6 for test
      return [];
    };

    const res1 = await scraperService.resolveHostAndSelectIp('https://example.com');
    assert.ok(res1 && res1.ip === '93.184.216.34', 'Should resolve example.com to IPv4');

      const res2 = await scraperService.resolveHostAndSelectIp('https://v6only.test');
      console.log('DEBUG res2 =', res2);
  assert.ok(res2 && res2.ip === '2001:4860:4860::8888', 'Should resolve v6only.test to IPv6');

    const res3 = await scraperService.resolveHostAndSelectIp('https://nope.test');
    assert.strictEqual(res3, null, 'Should return null for unresolved host');

    console.log('resolveHostAndSelectIp tests passed');
  } finally {
    dns.promises.resolve4 = origResolve4;
    dns.promises.resolve6 = origResolve6;
  }
}

async function run() {
  await testIsSafeUrl();
  await testResolveHostAndSelectIp();
  console.log('All unit tests passed');
}

run().catch(err => {
  console.error('Unit tests failed:', err);
  process.exit(1);
});
