/**
 * Sistema de Caché para API Responses
 * Estrategia: Stale-While-Revalidate
 * - Devuelve datos cacheados inmediatamente si existen
 * - Revalida en segundo plano
 * - Invalida caché de forma controlada
 */

class APICache {
  constructor() {
    this.cache = new Map();
    this.cacheExpiration = new Map();
    this.defaultTTL = 5 * 60 * 1000; // 5 minutos default
    this.maxSize = 50; // Máximo 50 entradas
  }

  /**
   * Genera key única para caché basada en URL y params
   */
  generateKey(url, params = {}) {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((acc, key) => {
        acc[key] = params[key];
        return acc;
      }, {});
    
    return `${url}::${JSON.stringify(sortedParams)}`;
  }

  /**
   * Obtiene datos del caché si están vigentes
   */
  get(key) {
    const expirationTime = this.cacheExpiration.get(key);
    
    // Si no existe o expiró
    if (!expirationTime || Date.now() > expirationTime) {
      this.cache.delete(key);
      this.cacheExpiration.delete(key);
      return null;
    }
    
    return this.cache.get(key);
  }

  /**
   * Almacena datos en caché con TTL
   */
  set(key, data, ttl = this.defaultTTL) {
    // Si alcanzamos el límite, eliminar entrada más antigua
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
      this.cacheExpiration.delete(firstKey);
    }
    
    this.cache.set(key, data);
    this.cacheExpiration.set(key, Date.now() + ttl);
  }

  /**
   * Invalida caché por patrón
   * Ejemplo: invalidate('/links') invalida todos los endpoints de links
   */
  invalidate(pattern) {
    const keysToDelete = [];
    
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => {
      this.cache.delete(key);
      this.cacheExpiration.delete(key);
    });
    
    return keysToDelete.length;
  }

  /**
   * Limpia todo el caché
   */
  clear() {
    this.cache.clear();
    this.cacheExpiration.clear();
  }

  /**
   * Obtiene estadísticas del caché
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * Verifica si una key está en caché y vigente
   */
  has(key) {
    return this.get(key) !== null;
  }
}

// Instancia singleton
export const apiCache = new APICache();

/**
 * Hook de React para usar el caché de API
 */
export const useCachedAPI = () => {
  return {
    getCache: (url, params) => apiCache.get(apiCache.generateKey(url, params)),
    setCache: (url, params, data, ttl) => 
      apiCache.set(apiCache.generateKey(url, params), data, ttl),
    invalidateCache: (pattern) => apiCache.invalidate(pattern),
    clearCache: () => apiCache.clear(),
    getCacheStats: () => apiCache.getStats(),
  };
};

export default apiCache;
