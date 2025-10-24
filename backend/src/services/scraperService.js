import axios from 'axios';
import * as cheerio from 'cheerio';

class ScraperService {
  constructor() {
    this.userAgent = process.env.USER_AGENT || 'LinkStash-Bot/1.0';
    this.timeout = 10000; // 10 segundos
  }

  async scrapeUrl(url) {
    try {
      // Validar la URL
      if (!this.isValidUrl(url)) {
        throw new Error('URL no válida');
      }

      console.log(`🕷️ Iniciando scraping de: ${url}`);

      // Realizar la petición HTTP
      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'es-ES,es;q=0.8,en-US;q=0.5,en;q=0.3',
          'Accept-Encoding': 'gzip, deflate',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        timeout: this.timeout,
        maxRedirects: 5,
        validateStatus: (status) => status < 400
      });

      // Parsear el HTML
      const $ = cheerio.load(response.data);
      
      // Extraer metadata
      const metadata = {
        title: this.extractTitle($),
        description: this.extractDescription($),
        image: this.extractImage($, url),
        siteName: this.extractSiteName($),
        favicon: this.extractFavicon($, url)
      };

      console.log(`✅ Scraping completado para: ${url}`);
      return {
        success: true,
        data: metadata
      };

    } catch (error) {
      console.error(`❌ Error en scraping de ${url}:`, error.message);
      
      // Retornar datos básicos en caso de error
      return {
        success: false,
        error: error.message,
        data: {
          title: this.extractDomainFromUrl(url),
          description: '',
          image: '',
          siteName: this.extractDomainFromUrl(url),
          favicon: ''
        }
      };
    }
  }

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
    const text = `${title} ${description} ${siteName}`.toLowerCase();
    
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
      if (text.includes(domain)) {
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

    return [...new Set(tags)]; // Eliminar duplicados
  }
}

export default new ScraperService();
