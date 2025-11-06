import assert from 'assert';
import scraperService from '../src/services/scraperService.js';
import dns from 'dns';
import axios from 'axios';

// Helpers to stub and restore
const origResolve4 = dns.promises.resolve4;
const origResolve6 = dns.promises.resolve6;
const origAxiosGet = axios.get;

async function testRedirectsAllowed() {
  console.log('Running redirect allowed test...');

  // Mock DNS
  dns.promises.resolve4 = async (host) => {
    if (host === 'host1.test') return ['93.184.216.34'];
    if (host === 'host2.test') return ['93.184.216.35'];
    return [];
  };
  dns.promises.resolve6 = async (host) => [];

  // Mock axios.get
  axios.get = async (requestUrl, opts) => {
    if (requestUrl.includes('93.184.216.34')) {
      return { status: 302, headers: { location: 'https://host2.test/' } };
    }
    if (requestUrl.includes('93.184.216.35')) {
      return { status: 200, data: '<html><head><title>Final Page</title></head><body></body></html>' };
    }
    throw new Error('Unexpected requestUrl in mock: ' + requestUrl);
  };

  const res = await scraperService.scrapeUrl('https://host1.test/');
  assert.strictEqual(res.success, true, 'Redirect chain should succeed');
  assert.strictEqual(res.data.title, 'Final Page', 'Title should be extracted from final page');

  console.log('redirect allowed test passed');
}

async function testRedirectToPrivateRejected() {
  console.log('Running redirect to private test...');

  dns.promises.resolve4 = async (host) => {
    if (host === 'host1.test') return ['93.184.216.34'];
    if (host === 'host-private.test') return ['192.168.1.5'];
    return [];
  };
  dns.promises.resolve6 = async (host) => [];

  axios.get = async (requestUrl, opts) => {
    if (requestUrl.includes('93.184.216.34')) {
      return { status: 302, headers: { location: 'https://host-private.test/' } };
    }
    if (requestUrl.includes('192.168.1.5')) {
      // Should not reach this because private should be rejected before requesting
      return { status: 200, data: '<html><head><title>Private</title></head></html>' };
    }
    throw new Error('Unexpected requestUrl in mock: ' + requestUrl);
  };

  const res = await scraperService.scrapeUrl('https://host1.test/');
  assert.strictEqual(res.success, false, 'Redirect to private should cause failure');
  console.log('redirect to private test passed');
}

async function run() {
  try {
    await testRedirectsAllowed();
    // Restore between tests
    dns.promises.resolve4 = origResolve4;
    dns.promises.resolve6 = origResolve6;
    axios.get = origAxiosGet;

    await testRedirectToPrivateRejected();
    console.log('All redirect tests passed');
  } finally {
    dns.promises.resolve4 = origResolve4;
    dns.promises.resolve6 = origResolve6;
    axios.get = origAxiosGet;
  }
}

run().catch(err => {
  console.error('Redirect tests failed:', err);
  process.exit(1);
});
