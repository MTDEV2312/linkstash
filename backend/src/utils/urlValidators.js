import dns from 'dns';
import ipaddr from 'ipaddr.js';

export function looksLikeObfuscatedIp(hostname) {
  if (!hostname) return false;
  // Digits-only: possible decimal representation of IPv4
  if (/^\d+$/.test(hostname)) return true;
  // Hex with 0x prefix
  if (/^0x[0-9a-f]+$/i.test(hostname)) return true;
  // Octal-like (heuristic)
  if (/^0[0-7]+$/.test(hostname)) return true;
  // IPv4-mapped IPv6 or mixed forms
  if (hostname.includes('::ffff:') || /^[0-9a-f:]+:[0-9.]+$/i.test(hostname)) return true;
  return false;
}

export function isIpPrivate(ipOrParsed) {
  try {
    let addr = ipOrParsed;
    if (typeof ipOrParsed === 'string') addr = ipaddr.parse(ipOrParsed);

    const range = addr.range();

    // Considerar permitido sólo el rango 'unicast'. Cualquier otro rango se trata como no público.
    return range !== 'unicast';
  } catch (e) {
    return true;
  }
}

export function sanitizeHostHeader(host) {
  return String(host || '').replace(/[\r\n]/g, '').toLowerCase();
}

// Resolve A and AAAA records using an optional resolver (servers array). Returns array of addresses.
export async function resolvePublicAddresses(hostname, servers) {
  let v4 = [];
  let v6 = [];
  if (Array.isArray(servers) && servers.length) {
    const resolver = new dns.Resolver();
    try { resolver.setServers(servers); } catch (e) { /* ignore */ }
    v4 = await resolver.resolve4(hostname).catch(() => []);
    v6 = await resolver.resolve6(hostname).catch(() => []);
  } else {
    // Use system promises API (this is also mockable in tests via dns.promises.resolve4)
    v4 = await dns.promises.resolve4(hostname).catch(() => []);
    v6 = await dns.promises.resolve6(hostname).catch(() => []);
  }
  const addresses = [...(v4 || []), ...(v6 || [])];
  // Filter out malformed entries
  const filtered = addresses.filter(a => {
    try { ipaddr.parse(a); return true; } catch (e) { return false; }
  });
  return filtered;
}
