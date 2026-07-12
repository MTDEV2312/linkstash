import axios from 'axios';
import * as cheerio from 'cheerio';
import dns from 'dns';
import ipaddr from 'ipaddr.js';
import net from 'net';
import http from 'http';
import https from 'https';
import tls from 'tls';
import { looksLikeObfuscatedIp, isIpPrivate as utilIsIpPrivate, sanitizeHostHeader, resolvePublicAddresses } from '../utils/urlValidators.js';
import { getNextDefaultImage } from '../config/defaults.js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('ScraperService');

class ScraperService {
  constructor() {
    const ua = process.env.USER_AGENT || '';
    this.userAgent = (ua === 'LinkStash-Bot/1.0' || !ua)
      ? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      : ua;
    this.timeout = 10000; // 10 segundos
  }

  async scrapeUrl(url) {
    try {
      // Validar la URL y comprobar si es segura (evitar SSRF)
      if (!this.isValidUrl(url)) {
        throw new Error('URL no válida');
      }
      const initialSafe = await this.getSafeUrlInfo(url);
      if (!initialSafe.ok) {
        throw new Error('URL no permitida (falló la comprobación de seguridad)');
      }

      // Rechazar URLs que incluyan credenciales en el userinfo (evita fugas y vectores raros)
      try {
        const parsedInitial = new URL(url);
        if (parsedInitial.username || parsedInitial.password) {
          throw new Error('URLs con credenciales de usuario no están permitidas');
        }
      } catch (e) {
        // Si no se puede parsear aquí algo raro, tratar como no válida
        throw new Error('URL no válida (falló parseo de userinfo)');
      }

      logger.info(`Iniciando scraping de: ${url}`);

      // 1. Intentar scraping local primero
      try {
        const localResult = await this.scrapeUrlLocal(url, initialSafe.addresses);
        if (localResult && localResult.success) {
          return localResult;
        }
      } catch (localError) {
        logger.warn(`Scraping local falló para ${url}, intentando fallback con Microlink: ${localError.message}`);
      }

      // 2. Si el local falló o no fue exitoso, intentar Microlink
      const microlinkResult = await this.scrapeWithMicrolink(url);
      if (microlinkResult && microlinkResult.success) {
        return microlinkResult;
      }

      // Si ambos fallaron, lanzar el error
      throw new Error('No se pudo extraer metadata del enlace (bloqueo o timeout)');

    } catch (error) {
      logger.error(`Error en scraping de ${url}`, error);
      
      // Clasificar el tipo de error para mejor manejo en el frontend
      const errorMessage = error.message || 'Error desconocido en scraping';
      let errorType = 'SCRAPING_ERROR';
      
      if (errorMessage.includes('RATE_LIMIT')) {
        errorType = 'RATE_LIMIT_ERROR';
      } else if (errorMessage.includes('BLOCKED')) {
        errorType = 'BLOCKED_ERROR';
      } else if (errorMessage.includes('CONNECTION')) {
        errorType = 'CONNECTION_ERROR';
      }
      
      // Retornar datos básicos en caso de error con tipo específico
      return {
        success: false,
        error: errorMessage,
        errorType,
        data: {
          title: this.extractDomainFromUrl(url),
          description: '',
          image: '',
          siteName: this.extractDomainFromUrl(url),
          favicon: '',
          url
        }
      };
    }
  }

  async scrapeWithMicrolink(url) {
    try {
      logger.info(`[Fallback] Intentando scraping con Microlink.io para: ${url}`);
      // Microlink.io no requiere API key en su plan gratuito (250 req/día)
      const response = await axios.get(`https://api.microlink.io?url=${encodeURIComponent(url)}`, {
        timeout: 8000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      
      if (response.data && response.data.status === 'success') {
        const item = response.data.data;
        
        let image = item.image?.url || item.logo?.url || '';
        if (image && this.isValidUrl(image)) {
          const safeImg = await this.getSafeUrlInfo(image);
          if (!safeImg.ok) image = '';
        } else {
          image = '';
        }

        return {
          success: true,
          data: {
            title: this.cleanText(item.title || ''),
            description: this.cleanText(item.description || ''),
            image,
            siteName: item.publisher || this.extractDomainFromUrl(url),
            favicon: item.logo?.url || '',
            url
          }
        };
      }
      return null;
    } catch (err) {
      logger.error(`[Fallback] Microlink.io falló para ${url}:`, err.message);
      return null;
    }
  }

  async scrapeUrlLocal(url, initialAddresses) {
    // Detectar sitios especiales y aplicar estrategias específicas
    const specialResult = await this.trySpecialScraping(url);
    if (specialResult) {
      logger.info(`Scraping especial completado para: ${url}`);
      return specialResult;
    }

    // Realizar la petición HTTP de forma segura
    const maxHops = 5;
    let currentUrl = url;
    let response = null;
    let addresses = initialAddresses;

    for (let hop = 0; hop < maxHops; hop++) {
      if (hop > 0) {
        const safeCheck = await this.getSafeUrlInfo(currentUrl);
        if (!safeCheck.ok) {
          throw new Error('Redirección a URL no permitida');
        }
        addresses = safeCheck.addresses;
      }

      // Resolver host y obtener IP validada
      const resolved = await this.resolveHostAndSelectIp(currentUrl, addresses);
      if (!resolved || !resolved.ip) throw new Error('No se pudo resolver la IP segura');

      // Crear un agent que conecte directamente a la IP validada y preserve Host/SNI
      const agent = this.createAgentFor(resolved);

      // Construir la URL objetivo usando la IP resuelta para evitar cualquier resolución adicional
      const parsedUrl = new URL(currentUrl);
      const ipAddr = resolved.ip;
      const hostForUrl = ipAddr.includes(':') ? `[${ipAddr}]` : ipAddr; // IPv6 must be bracketed in URLs
      const defaultPort = parsedUrl.protocol === 'https:' ? 443 : 80;
      // Decide si necesitamos incluir puerto en la URL construida
      const includePort = (parsedUrl.port && parseInt(parsedUrl.port, 10) !== defaultPort) || (resolved.port && resolved.port !== defaultPort);
      const portPart = includePort ? `:${resolved.port || parsedUrl.port}` : '';
      const pathAndQuery = `${parsedUrl.pathname || '/'}${parsedUrl.search || ''}`;
      const requestUrl = `${parsedUrl.protocol}//${hostForUrl}${portPart}${pathAndQuery}`;
      
      // ---- SSRF Mitigation: Validate Resolved IP ----
      let parsedIP;
      try {
        parsedIP = ipaddr.parse(ipAddr);
      } catch (e) {
        throw new Error('La IP resuelta no es válida');
      }
      if (utilIsIpPrivate(parsedIP)) {
        throw new Error('La IP de destino no está permitida');
      }

      // Sanear host header para evitar inyección de cabeceras
      const safeHostHeader = sanitizeHostHeader(resolved.hostname || parsedUrl.hostname);

      try {
        response = await axios.get(requestUrl, {
          headers: {
            'User-Agent': this.userAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'close',
            'Upgrade-Insecure-Requests': '1',
            'Host': safeHostHeader
          },
          timeout: this.timeout,
          // No seguir redirecciones automáticamente
          maxRedirects: 0,
          validateStatus: (status) => status < 500, // Aceptar hasta 4xx para manejar rate limits
          httpAgent: resolved.protocol === 'http:' ? agent : undefined,
          httpsAgent: resolved.protocol === 'https:' ? agent : undefined,
          // Limitar tamaño de respuesta para mitigar DoS accidental
          maxContentLength: 1024 * 1024 * 2, // 2 MB
          maxBodyLength: 1024 * 1024 * 2,
          responseType: 'text'
        });
      } catch (axiosError) {
        // Manejar errores específicos de rate limit o bloqueo
        if (axiosError.response?.status === 429) {
          throw new Error('RATE_LIMIT_ERROR: El sitio ha bloqueado temporalmente las solicitudes. Reintenta más tarde.');
        }
        if (axiosError.response?.status === 403) {
          throw new Error('BLOCKED_ERROR: El sitio ha bloqueado el acceso a nuestro bot. Verifica la URL.');
        }
        if (axiosError.code === 'ECONNREFUSED' || axiosError.code === 'ETIMEDOUT') {
          throw new Error('CONNECTION_ERROR: No se pudo conectar con el servidor. El sitio podría estar inactivo.');
        }
        throw axiosError;
      }

      // Validar código de estado
      if (response.status === 429) {
        throw new Error('RATE_LIMIT_ERROR: El sitio ha bloqueado temporalmente las solicitudes. Reintenta más tarde.');
      }
      if (response.status === 403) {
        throw new Error('BLOCKED_ERROR: El sitio ha bloqueado el acceso. Verifica la URL.');
      }
      if (response.status >= 400) {
        throw new Error(`HTTP ${response.status}: No se pudo acceder a la página.`);
      }

      // Si hay una redirección (3xx) y el servidor devolvió Location, calcular la URL absoluta y repetir
      if (response.status >= 300 && response.status < 400 && response.headers && response.headers.location) {
        try {
          const next = new URL(response.headers.location, currentUrl).href;
          currentUrl = next;
          // seguir al siguiente hop
          continue;
        } catch (e) {
          throw new Error('Redirección inválida');
        }
      }

      // Validar tipo de contenido: esperamos HTML/text para scraping
      const contentType = (response.headers && response.headers['content-type']) || '';
      if (contentType && !contentType.toLowerCase().includes('html') && !contentType.toLowerCase().includes('text')) {
        throw new Error('Tipo de contenido no soportado para scraping');
      }

      // Si no era una redirección, salir del bucle y usar `response`
      break;
    }

    // Parsear el HTML
    const $ = cheerio.load(response.data);

    // Extraer metadata y validar recursos (images / favicons)
    const title = this.extractTitle($);
    const description = this.extractDescription($);
    const siteName = this.extractSiteName($);

    let image = this.extractImage($, url);
    if (image && this.isValidUrl(image)) {
      const safeImg = await this.getSafeUrlInfo(image);
      if (!safeImg.ok) image = '';
    } else {
      image = '';
    }

    // Si no hay imagen válida, usar imagen por defecto configurable
    if (!image) {
      // Permitir override mediante variable de entorno
      const defaultImg = process.env.DEFAULT_IMAGE_URL || null;
      if (defaultImg && this.isValidUrl(defaultImg)) {
        image = defaultImg;
      } else {
        // Usar la(s) imagen(es) definidas en public/defaults (random o roundrobin)
        image = getNextDefaultImage();
      }
    }

    let favicon = this.extractFavicon($, url);
    if (favicon && this.isValidUrl(favicon)) {
      const safeFav = await this.getSafeUrlInfo(favicon);
      if (!safeFav.ok) favicon = '';
    } else {
      favicon = '';
    }

    return {
      success: true,
      data: { title, description, image, siteName, favicon, url }
    };
  }

  // Comprobaciones adicionales para mitigar SSRF
  // isSafeUrl (compat) -> delega en getSafeUrlInfo
  async isSafeUrl(urlString) {
    const info = await this.getSafeUrlInfo(urlString);
    return info.ok;
  }

  // getSafeUrlInfo devuelve { ok: boolean, addresses: [ips...] }
  async getSafeUrlInfo(urlString) {
    try {
      const url = new URL(urlString);

      if (!(url.protocol === 'https:' || url.protocol === 'http:')) return { ok: false, addresses: [] };

      const hostname = url.hostname;
      if (!hostname || hostname === 'localhost') return { ok: false, addresses: [] };
      if (hostname.endsWith('.local')) return { ok: false, addresses: [] };

      const allowedPortsEnv = process.env.SCRAPER_ALLOWED_PORTS; // formato: 80,443
      const allowedPorts = allowedPortsEnv ? allowedPortsEnv.split(',').map(p => parseInt(p.trim(), 10)).filter(Boolean) : [80, 443];
      if (url.port) {
        const portNum = parseInt(url.port, 10);
        if (!allowedPorts.includes(portNum)) return { ok: false, addresses: [] };
      }

      // Permitir override mediante variable de entorno para tests
      if (process.env.SCRAPER_HOST_ALLOWLIST) {
        const patterns = process.env.SCRAPER_HOST_ALLOWLIST.split(',').map(s => s.trim()).filter(Boolean);
        const matched = patterns.some(p => {
          if (p.startsWith('.')) return hostname.endsWith(p);
          return hostname === p || hostname.endsWith('.' + p);
        });
        
        // Si está en allowlist, saltamos el resto de validaciones (SSRF)
        if (matched) return { ok: true, addresses: ['127.0.0.1'] }; 
      }

      const allowlistEnv = process.env.SCRAPER_HOST_ALLOWLIST;
      const allowPublic = (process.env.SCRAPER_ALLOW_PUBLIC || 'true').toLowerCase() === 'true';

      if (allowlistEnv) {
        const patterns = allowlistEnv.split(',').map(s => s.trim()).filter(Boolean);
        const matched = patterns.some(p => {
          if (p.startsWith('.')) return hostname.endsWith(p);
          return hostname === p || hostname.endsWith('.' + p);
        });

        if (!matched && !allowPublic) return { ok: false, addresses: [] };
      } else if (!allowPublic) {
        return { ok: false, addresses: [] };
      }

      if (looksLikeObfuscatedIp(hostname)) {
        try {
          const parsed = ipaddr.parse(hostname);
          if (utilIsIpPrivate(parsed)) return { ok: false, addresses: [] };
          return { ok: true, addresses: [hostname] };
        } catch (e) { return { ok: false, addresses: [] }; }
      }

      if (net.isIP(hostname)) {
        try {
          const parsed = ipaddr.parse(hostname);
          if (utilIsIpPrivate(parsed)) return { ok: false, addresses: [] };
          return { ok: true, addresses: [hostname] };
        } catch (e) { return { ok: false, addresses: [] }; }
      }

      const resolverServersEnv = process.env.SCRAPER_DNS_RESOLVER_SERVERS; // opcional: 1.1.1.1,8.8.8.8
      const resolverServers = resolverServersEnv ? resolverServersEnv.split(',').map(s => s.trim()).filter(Boolean) : [];
      let addresses = [];
      try {
        addresses = await resolvePublicAddresses(hostname, resolverServers);
      } catch (e) {
        return { ok: false, addresses: [] };
      }

      if (!addresses.length) return { ok: false, addresses: [] };

      const publicAddrs = [];
      for (const addr of addresses) {
        try {
          const parsed = ipaddr.parse(addr);
          if (!utilIsIpPrivate(parsed)) publicAddrs.push(addr);
        } catch (e) { /* ignore */ }
      }

      if (!publicAddrs.length) return { ok: false, addresses: [] };
      return { ok: true, addresses: publicAddrs };
    } catch (err) {
      return { ok: false, addresses: [] };
    }
  }

  // Resuelve host y devuelve la primera IP pública válida (prefiere IPv4)
  // allowedAddrs: optional array of IPs previously resolved (mitiga TOCTOU)
  async resolveHostAndSelectIp(urlString, allowedAddrs) {
    try {
      const url = new URL(urlString);
      const hostname = url.hostname;
      const protocol = url.protocol;
      const port = url.port ? parseInt(url.port, 10) : (protocol === 'https:' ? 443 : 80);

      // Handle IP literal
      if (net.isIP(hostname)) {
        const parsed = ipaddr.parse(hostname);
        if (utilIsIpPrivate(parsed)) return null;
        return { hostname, ip: hostname, port, protocol };
      }

      const [v4, v6] = await Promise.all([
        dns.promises.resolve4(hostname).catch(() => []),
        dns.promises.resolve6(hostname).catch(() => [])
      ]);
      

      // Preferir IPv4 público
      const candidates = [...(v4 || []), ...(v6 || [])];

      // Si se pasaron allowedAddrs, filtramos candidatos para sólo usar esas IPs (mitigación TOCTOU)
      const allowedSet = Array.isArray(allowedAddrs) && allowedAddrs.length ? new Set(allowedAddrs) : null;

      for (const addr of candidates) {
        try {
          if (allowedSet && !allowedSet.has(addr)) continue;
          const parsed = ipaddr.parse(addr);
          
          if (!utilIsIpPrivate(parsed)) {
            return { hostname, ip: addr, port, protocol };
          }
        } catch (e) {
          continue;
        }
      }

      return null;
    } catch (e) {
      return null;
    }
  }

  // Crea un http/https agent que conecte a la IP validada pero preserve Host/SNI
  createAgentFor({ hostname, ip, port, protocol }) {
    const isHttps = protocol === 'https:';

    if (isHttps) {
      return new https.Agent({
        keepAlive: false,
        rejectUnauthorized: true,
        createConnection: (options, callback) => {
          // Conectar directamente a la IP y establecer SNI en el TLS handshake
          const connectOpts = { host: ip, port: options.port || port };
          const socket = tls.connect({
            host: ip,
            port: connectOpts.port,
            servername: hostname,
            rejectUnauthorized: true
          });

          // Al conectarse, comprobar explícitamente identidad del certificado
          socket.once('secureConnect', () => {
            try {
              const cert = socket.getPeerCertificate(true);
              const err = tls.checkServerIdentity(hostname, cert);
              if (err) {
                socket.destroy(err);
                return callback(err);
              }
              return callback(null, socket);
            } catch (e) {
              socket.destroy(e);
              return callback(e);
            }
          });

          socket.on('error', (e) => callback(e));
          return socket;
        }
      });
    }

    return new http.Agent({
      keepAlive: false,
      createConnection: (options, callback) => net.connect({ host: ip, port: options.port || port }, callback)
    });
  }
  // isIpPrivate fue movido a utils (isIpPrivate)

  extractTitle($) {
    // Prioridad: og:title -> twitter:title -> title tag -> h1
    const title = 
      $('meta[property="og:title"]').attr('content') ||
      $('meta[name="twitter:title"]').attr('content') ||
      $('title').text() ||
      $('h1').first().text() ||
      'Sin título';

    return this.cleanText(title);
  }

  extractDescription($) {
    // Prioridad: og:description -> twitter:description -> meta description
    const description = 
      $('meta[property="og:description"]').attr('content') ||
      $('meta[name="twitter:description"]').attr('content') ||
      $('meta[name="description"]').attr('content') ||
      '';

    return this.cleanText(description);
  }

  extractImage($, baseUrl) {
    // Prioridad: og:image -> twitter:image -> primera imagen del contenido
    let imageUrl = 
      $('meta[property="og:image"]').attr('content') ||
      $('meta[name="twitter:image"]').attr('content') ||
      $('meta[name="twitter:image:src"]').attr('content') ||
      $('img').first().attr('src') ||
      '';

    // Convertir URL relativa a absoluta
    if (imageUrl && !imageUrl.startsWith('http')) {
      try {
        const base = new URL(baseUrl);
        imageUrl = new URL(imageUrl, base.origin).href;
      } catch (e) {
        imageUrl = '';
      }
    }

    return imageUrl;
  }

  extractSiteName($) {
    const siteName = 
      $('meta[property="og:site_name"]').attr('content') ||
      $('meta[name="application-name"]').attr('content') ||
      $('meta[name="apple-mobile-web-app-title"]').attr('content') ||
      '';

    return this.cleanText(siteName);
  }

  extractFavicon($, baseUrl) {
    let faviconUrl = 
      $('link[rel="icon"]').attr('href') ||
      $('link[rel="shortcut icon"]').attr('href') ||
      $('link[rel="apple-touch-icon"]').attr('href') ||
      '/favicon.ico';

    // Convertir URL relativa a absoluta
    if (faviconUrl && !faviconUrl.startsWith('http')) {
      try {
        const base = new URL(baseUrl);
        faviconUrl = new URL(faviconUrl, base.origin).href;
      } catch (e) {
        faviconUrl = '';
      }
    }

    return faviconUrl;
  }

  isValidUrl(string) {
    try {
      const url = new URL(string);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (error) {
      return false;
    }
  }

  extractDomainFromUrl(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch (error) {
      return 'Sitio web';
    }
  }

  cleanText(text) {
    if (!text) return '';
    
    return text
      .replace(/\s+/g, ' ')     // Reemplazar múltiples espacios por uno
      .replace(/\n/g, ' ')      // Reemplazar saltos de línea por espacios
      .trim()                   // Quitar espacios al inicio y final
      .substring(0, 200);       // Limitar longitud
  }

  // Método para generar etiquetas automáticas basadas en el contenido
  generateAutoTags(metadata) {
    const tags = [];
    const { title, description, siteName } = metadata;
    
    // Extraer palabras clave comunes
    const text = `${title || ''} ${description || ''} ${siteName || ''}`.toLowerCase();
    
    // Añadir detección basada en dominio/hostname si metadata incluye siteName u origin
    // Metadata puede no contener el hostname; intentar inferir de siteName
    let hostname = '';
    if (metadata.url) {
      try { hostname = new URL(metadata.url).hostname.toLowerCase(); } catch (e) { hostname = ''; }
    }
    if (!hostname && siteName) {
      hostname = siteName.toLowerCase();
    }
    
    // Etiquetas basadas en dominios populares
    const domainTags = {
      'github.com': 'desarrollo',
      'stackoverflow.com': 'programacion',
      'youtube.com': 'video',
      'twitter.com': 'social',
      'linkedin.com': 'profesional',
      'medium.com': 'articulo',
      'dev.to': 'desarrollo',
      'codepen.io': 'frontend'
    };

    Object.entries(domainTags).forEach(([domain, tag]) => {
      if (text.includes(domain) || (hostname && hostname.includes(domain))) {
        tags.push(tag);
      }
    });

    // Etiquetas basadas en palabras clave
    const keywordTags = {
      'tutorial': 'tutorial',
      'guide': 'guia',
      'documentation': 'docs',
      'api': 'api',
      'react': 'react',
      'javascript': 'javascript',
      'python': 'python',
      'node': 'nodejs'
    };

    Object.entries(keywordTags).forEach(([keyword, tag]) => {
      if (text.includes(keyword)) {
        tags.push(tag);
      }
    });

    // Si no se generaron tags, intentar extraer palabras clave del título (n-grams simples)
    if (tags.length === 0 && title) {
      const words = title.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).filter(Boolean);
      const common = ['how', 'to', 'the', 'a', 'an', 'en', 'de', 'y', 'con', 'for', 'from'];
      for (const w of words.slice(0, 6)) {
        if (w.length >= 3 && !common.includes(w)) tags.push(w);
      }
    }

    return [...new Set(tags)]; // Eliminar duplicados
  }

  // Scraping especial para sitios que bloquean bots
  async trySpecialScraping(url) {
    try {
      const parsedUrl = new URL(url);
      const hostname = parsedUrl.hostname.toLowerCase();
      
      // YouTube - extraer datos del JSON-LD o atributos del video
      if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
        logger.info('[Special] Detectado YouTube, aplicando estrategia especial', { url });
        return await this.scrapeYouTube(url);
      }
      
      // Twitter/X - usar información mínima
      if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
        logger.info('[Special] Detectado Twitter/X, aplicando estrategia especial', { url });
        return await this.scrapeTwitter(url);
      }
      
      // Vimeo
      if (hostname.includes('vimeo.com')) {
        logger.info('[Special] Detectado Vimeo, aplicando estrategia especial', { url });
        return await this.scrapeVimeo(url);
      }

      return null; // No es un sitio especial
    } catch (e) {
      logger.error('[Special] Error en scraping especial', e, { url });
      return null; // Fallback a scraping normal
    }
  }

  // Scraper especial para YouTube
  async scrapeYouTube(url) {
    try {
      const videoIdMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      if (!videoIdMatch) {
        return null;
      }

      const videoId = videoIdMatch[1];
      
      logger.info(`[YouTube] Scrapeando video: ${videoId}`, { url });
      
      // Intentar extraer metadata de la página con límite menor para YouTube
      try {
        const response = await axios.get(url, {
          headers: {
            'User-Agent': this.userAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'es-ES,es;q=0.8',
          },
          timeout: 5000,  // Timeout más corto para YouTube
          maxRedirects: 0,
          validateStatus: (status) => status < 500,
          maxContentLength: 512 * 1024,  // 512 KB para YouTube (menor que 2MB general)
          maxBodyLength: 512 * 1024,
          responseType: 'text'
        });

        if (response.status >= 400) {
          logger.warn(`[YouTube] No se pudo acceder (status ${response.status}), usando fallback`, { url, status: response.status });
          // Fallback a thumbnail si no se puede acceder
          return {
            success: true,
            data: {
              title: `Video de YouTube`,
              description: 'Video compartido desde YouTube',
              image: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
              siteName: 'YouTube',
              favicon: 'https://www.youtube.com/favicon.ico',
              url
            }
          };
        }

        const $ = cheerio.load(response.data);
        
        // Intentar extraer del JSON-LD o meta tags
        let title = $('meta[name="title"]').attr('content') ||
                    $('meta[property="og:title"]').attr('content') ||
                    $('h1').first().text() ||
                    `Video de YouTube`;
        
        let description = $('meta[name="description"]').attr('content') ||
                          $('meta[property="og:description"]').attr('content') ||
                          'Video compartido desde YouTube';
        
        let image = $('meta[property="og:image"]').attr('content') ||
                    `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

        return {
          success: true,
          data: {
            title: this.cleanText(title),
            description: this.cleanText(description),
            image,
            siteName: 'YouTube',
            favicon: 'https://www.youtube.com/favicon.ico',
            url
          }
        };
      } catch (axiosErr) {
        // Detectar errores de tamaño de contenido
        if (axiosErr.code === 'ERR_FR_MAX_BODY_LENGTH_EXCEEDED' || 
            axiosErr.message?.includes('maxContentLength') ||
            axiosErr.message?.includes('maxBodyLength')) {
          logger.warn(`[YouTube] Contenido muy grande, usando thumbnail`, { url, error: axiosErr.message });
          // Retornar datos básicos pero válidos usando thumbnail
          return {
            success: true,
            data: {
              title: `Video de YouTube`,
              description: 'Video compartido desde YouTube',
              image: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
              siteName: 'YouTube',
              favicon: 'https://www.youtube.com/favicon.ico',
              url
            }
          };
        }
        
        // Otros errores de timeout/conexión
        if (axiosErr.code === 'ECONNABORTED' || axiosErr.code === 'ETIMEDOUT') {
          logger.warn(`[YouTube] Timeout`, { url, error: axiosErr.message });
          throw new Error(`CONNECTION_ERROR: YouTube tardó demasiado en responder. ${axiosErr.message}`);
        }
        
        throw axiosErr;
      }
    } catch (e) {
      logger.error('[YouTube] Error crítico', e, { url });
      // Retornar error para que el worker lo maneje
      return {
        success: false,
        error: `YouTube scraping falló: ${e.message}`,
        errorType: 'CONNECTION_ERROR',
        data: {
          title: 'Video de YouTube',
          description: 'Video compartido desde YouTube',
          image: '',
          siteName: 'YouTube',
          favicon: 'https://www.youtube.com/favicon.ico',
          url
        }
      };
    }
  }

  // Scraper especial para Twitter/X
  async scrapeTwitter(url) {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml',
        },
        timeout: 5000,  // Reducido a 5 segundos para Twitter también
        maxRedirects: 0,
        validateStatus: (status) => status < 500,
        maxContentLength: 512 * 1024,  // Reducido a 512 KB como YouTube
        maxBodyLength: 512 * 1024,
        responseType: 'text'
      });

      if (response.status >= 400) {
        logger.warn(`[Twitter] No se pudo acceder (status ${response.status}), usando fallback`, { url, status: response.status });
        return {
          success: true,
          data: {
            title: 'Tweet/Post en Twitter',
            description: 'Tweet compartido desde Twitter/X',
            image: '',
            siteName: 'Twitter',
            favicon: 'https://abs.twimg.com/favicons/twitter.ico',
            url
          }
        };
      }

      const $ = cheerio.load(response.data);

      let title = $('meta[property="og:title"]').attr('content') ||
                  $('meta[name="title"]').attr('content') ||
                  'Tweet en Twitter';
      
      let description = $('meta[property="og:description"]').attr('content') ||
                        $('meta[name="description"]').attr('content') ||
                        'Tweet compartido desde Twitter';
      
      let image = $('meta[property="og:image"]').attr('content') || '';

      return {
        success: true,
        data: {
          title: this.cleanText(title),
          description: this.cleanText(description),
          image,
          siteName: 'Twitter',
          favicon: 'https://abs.twimg.com/favicons/twitter.ico',
          url
        }
      };
    } catch (axiosErr) {
      // Detectar errores de tamaño de contenido
      if (axiosErr.code === 'ERR_FR_MAX_BODY_LENGTH_EXCEEDED' || 
          axiosErr.message?.includes('maxContentLength') ||
          axiosErr.message?.includes('maxBodyLength')) {
        logger.warn(`[Twitter] Contenido muy grande, usando fallback`, { url, error: axiosErr.message });
        // Retornar datos básicos pero válidos
        return {
          success: true,
          data: {
            title: 'Tweet/Post en Twitter',
            description: 'Tweet compartido desde Twitter/X',
            image: '',
            siteName: 'Twitter',
            favicon: 'https://abs.twimg.com/favicons/twitter.ico',
            url
          }
        };
      }
      
      // Otros errores de timeout/conexión
      if (axiosErr.code === 'ECONNABORTED' || axiosErr.code === 'ETIMEDOUT') {
        logger.warn(`[Twitter] Timeout`, { url, error: axiosErr.message });
        return {
          success: false,
          error: `Twitter scraping timeout: ${axiosErr.message}`,
          errorType: 'CONNECTION_ERROR',
          data: {
            title: 'Tweet en Twitter',
            description: 'Tweet compartido desde Twitter',
            image: '',
            siteName: 'Twitter',
            favicon: 'https://abs.twimg.com/favicons/twitter.ico',
            url
          }
        };
      }
      
      logger.error('[Twitter] Error', axiosErr, { url });
      return {
        success: false,
        error: `Twitter scraping falló: ${axiosErr.message}`,
        errorType: 'CONNECTION_ERROR',
        data: {
          title: 'Tweet en Twitter',
          description: 'Tweet compartido desde Twitter',
          image: '',
          siteName: 'Twitter',
          favicon: 'https://abs.twimg.com/favicons/twitter.ico',
          url
        }
      };
    }
  }

  // Scraper especial para Vimeo
  async scrapeVimeo(url) {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml',
        },
        timeout: 5000,  // Reducido a 5 segundos
        maxRedirects: 0,
        validateStatus: (status) => status < 500,
        maxContentLength: 512 * 1024,  // Reducido a 512 KB
        maxBodyLength: 512 * 1024,
        responseType: 'text'
      });

      if (response.status >= 400) {
        logger.warn(`[Vimeo] No se pudo acceder (status ${response.status}), usando fallback`, { url, status: response.status });
        return {
          success: true,
          data: {
            title: 'Video en Vimeo',
            description: 'Video compartido desde Vimeo',
            image: '',
            siteName: 'Vimeo',
            favicon: 'https://vimeo.com/favicon.ico',
            url
          }
        };
      }

      const $ = cheerio.load(response.data);

      let title = $('meta[property="og:title"]').attr('content') ||
                  $('meta[name="title"]').attr('content') ||
                  'Video en Vimeo';
      
      let description = $('meta[property="og:description"]').attr('content') ||
                        'Video compartido desde Vimeo';
      
      let image = $('meta[property="og:image"]').attr('content') || '';

      return {
        success: true,
        data: {
          title: this.cleanText(title),
          description: this.cleanText(description),
          image,
          siteName: 'Vimeo',
          favicon: 'https://vimeo.com/favicon.ico',
          url
        }
      };
    } catch (axiosErr) {
      // Detectar errores de tamaño de contenido
      if (axiosErr.code === 'ERR_FR_MAX_BODY_LENGTH_EXCEEDED' || 
          axiosErr.message?.includes('maxContentLength') ||
          axiosErr.message?.includes('maxBodyLength')) {
        logger.warn(`[Vimeo] Contenido muy grande, usando fallback`, { url, error: axiosErr.message });
        // Retornar datos básicos pero válidos
        return {
          success: true,
          data: {
            title: 'Video en Vimeo',
            description: 'Video compartido desde Vimeo',
            image: '',
            siteName: 'Vimeo',
            favicon: 'https://vimeo.com/favicon.ico',
            url
          }
        };
      }
      
      // Otros errores de timeout/conexión
      if (axiosErr.code === 'ECONNABORTED' || axiosErr.code === 'ETIMEDOUT') {
        logger.warn(`[Vimeo] Timeout`, { url, error: axiosErr.message });
        return {
          success: false,
          error: `Vimeo scraping timeout: ${axiosErr.message}`,
          errorType: 'CONNECTION_ERROR',
          data: {
            title: 'Video en Vimeo',
            description: 'Video compartido desde Vimeo',
            image: '',
            siteName: 'Vimeo',
            favicon: 'https://vimeo.com/favicon.ico',
            url
          }
        };
      }
      
      logger.error('[Vimeo] Error', axiosErr, { url });
      return {
        success: false,
        error: `Vimeo scraping falló: ${axiosErr.message}`,
        errorType: 'CONNECTION_ERROR',
        data: {
          title: 'Video en Vimeo',
          description: 'Video compartido desde Vimeo',
          image: '',
          siteName: 'Vimeo',
          favicon: 'https://vimeo.com/favicon.ico',
          url
        }
      };
    }
  }
}

export default new ScraperService();
