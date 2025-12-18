import { describe, it, expect, beforeEach, vi } from 'vitest'
import { apiCache } from '../../src/utils/apiCache'

describe('APICache Utility', () => {
  beforeEach(() => {
    // Limpiar cache antes de cada test
    apiCache.clear()
  })

  describe('Generación de claves', () => {
    it('debe generar la misma clave para URLs idénticas', () => {
      const key1 = apiCache.generateKey('/api/links', { page: 1 })
      const key2 = apiCache.generateKey('/api/links', { page: 1 })
      
      expect(key1).toBe(key2)
    })

    it('debe generar claves diferentes para parámetros diferentes', () => {
      const key1 = apiCache.generateKey('/api/links', { page: 1 })
      const key2 = apiCache.generateKey('/api/links', { page: 2 })
      
      expect(key1).not.toBe(key2)
    })

    it('debe manejar URLs sin parámetros', () => {
      const key = apiCache.generateKey('/api/dashboard')
      
      expect(key).toBeTruthy()
      expect(typeof key).toBe('string')
    })

    it('debe ordenar parámetros para consistencia', () => {
      const key1 = apiCache.generateKey('/api/links', { page: 1, limit: 10 })
      const key2 = apiCache.generateKey('/api/links', { limit: 10, page: 1 })
      
      expect(key1).toBe(key2)
    })
  })

  describe('Operaciones básicas', () => {
    it('debe guardar y recuperar datos', () => {
      const data = { message: 'test data' }
      const key = apiCache.generateKey('/api/test')
      
      apiCache.set(key, data, 60000) // 60 segundos
      const retrieved = apiCache.get(key)
      
      expect(retrieved).toEqual(data)
    })

    it('debe retornar null para claves inexistentes', () => {
      const result = apiCache.get('nonexistent-key')
      
      expect(result).toBeNull()
    })

    it('debe retornar null para datos expirados', () => {
      vi.useFakeTimers()
      
      const data = { message: 'test' }
      const key = apiCache.generateKey('/api/test')
      
      apiCache.set(key, data, 1000) // 1 segundo
      
      // Avanzar tiempo 2 segundos
      vi.advanceTimersByTime(2000)
      
      const result = apiCache.get(key)
      expect(result).toBeNull()
      
      vi.useRealTimers()
    })

    it('debe sobrescribir datos existentes', () => {
      const key = apiCache.generateKey('/api/test')
      
      apiCache.set(key, { value: 1 }, 60000)
      apiCache.set(key, { value: 2 }, 60000)
      
      const result = apiCache.get(key)
      expect(result).toEqual({ value: 2 })
    })
  })

  describe('Política LRU (Least Recently Used)', () => {
    it('debe eliminar entradas antiguas cuando se alcanza el límite', () => {
      const MAX_ENTRIES = 50
      
      // Llenar el cache hasta el límite
      for (let i = 0; i < MAX_ENTRIES; i++) {
        const key = apiCache.generateKey(`/api/test${i}`)
        apiCache.set(key, { index: i }, 60000)
      }
      
      // Verificar que todas las entradas están
      for (let i = 0; i < MAX_ENTRIES; i++) {
        const key = apiCache.generateKey(`/api/test${i}`)
        expect(apiCache.get(key)).toBeTruthy()
      }
      
      // Agregar una más - debería eliminar la más antigua
      const newKey = apiCache.generateKey('/api/test-new')
      apiCache.set(newKey, { index: 'new' }, 60000)
      
      // La primera entrada debería haber sido eliminada
      const firstKey = apiCache.generateKey('/api/test0')
      expect(apiCache.get(firstKey)).toBeNull()
      
      // La nueva debería estar
      expect(apiCache.get(newKey)).toBeTruthy()
    })
  })

  describe('Invalidación de cache', () => {
    it('debe invalidar entradas por patrón exacto', () => {
      apiCache.set('links-1', { data: 'test1' }, 60000)
      apiCache.set('links-2', { data: 'test2' }, 60000)
      apiCache.set('tags-1', { data: 'test3' }, 60000)
      
      apiCache.invalidate('links-1')
      
      expect(apiCache.get('links-1')).toBeNull()
      expect(apiCache.get('links-2')).toBeTruthy()
      expect(apiCache.get('tags-1')).toBeTruthy()
    })

    it('debe invalidar múltiples entradas por patrón', () => {
      apiCache.set('api-links-page1', { data: 'test1' }, 60000)
      apiCache.set('api-links-page2', { data: 'test2' }, 60000)
      apiCache.set('api-tags-page1', { data: 'test3' }, 60000)
      
      apiCache.invalidate('links')
      
      expect(apiCache.get('api-links-page1')).toBeNull()
      expect(apiCache.get('api-links-page2')).toBeNull()
      expect(apiCache.get('api-tags-page1')).toBeTruthy()
    })

    it('debe limpiar todo el cache', () => {
      apiCache.set('key1', { data: 'test1' }, 60000)
      apiCache.set('key2', { data: 'test2' }, 60000)
      apiCache.set('key3', { data: 'test3' }, 60000)
      
      apiCache.clear()
      
      expect(apiCache.get('key1')).toBeNull()
      expect(apiCache.get('key2')).toBeNull()
      expect(apiCache.get('key3')).toBeNull()
    })
  })

  describe('Estadísticas', () => {
    it('debe reportar estadísticas correctas', () => {
      // Cache vacío
      let stats = apiCache.getStats()
      expect(stats.size).toBe(0)
      expect(stats.maxSize).toBe(50)
      expect(stats.keys).toEqual([])
      
      // Agregar datos
      apiCache.set('key1', { data: 'test1' }, 60000)
      apiCache.set('key2', { data: 'test2' }, 60000)
      
      stats = apiCache.getStats()
      expect(stats.size).toBe(2)
      expect(stats.keys).toContain('key1')
      expect(stats.keys).toContain('key2')
    })

    it('debe actualizar estadísticas después de invalidación', () => {
      apiCache.set('key1', { data: 'test1' }, 60000)
      apiCache.set('key2', { data: 'test2' }, 60000)
      
      apiCache.invalidate('key1')
      
      const stats = apiCache.getStats()
      expect(stats.size).toBe(1)
      expect(stats.keys).toContain('key2')
      expect(stats.keys).not.toContain('key1')
    })
  })

  describe('Casos extremos', () => {
    it('debe manejar valores null y undefined', () => {
      const key = apiCache.generateKey('/api/test')
      
      apiCache.set(key, null, 60000)
      expect(apiCache.get(key)).toBeNull()
      
      apiCache.set(key, undefined, 60000)
      expect(apiCache.get(key)).toBeUndefined()
    })

    it('debe manejar objetos complejos', () => {
      const complexData = {
        nested: {
          array: [1, 2, 3],
          object: { foo: 'bar' },
        },
        date: new Date().toISOString(),
      }
      
      const key = apiCache.generateKey('/api/test')
      apiCache.set(key, complexData, 60000)
      
      const retrieved = apiCache.get(key)
      expect(retrieved).toEqual(complexData)
    })

    it('debe manejar TTL de 0 o negativo', () => {
      vi.useFakeTimers()
      
      const key = apiCache.generateKey('/api/test')
      apiCache.set(key, { data: 'test' }, 0)
      
      // Inmediatamente expirado
      vi.advanceTimersByTime(1)
      expect(apiCache.get(key)).toBeNull()
      
      vi.useRealTimers()
    })

    it('debe manejar claves muy largas', () => {
      const longUrl = '/api/' + 'a'.repeat(1000)
      const key = apiCache.generateKey(longUrl, { param: 'value' })
      
      apiCache.set(key, { data: 'test' }, 60000)
      expect(apiCache.get(key)).toEqual({ data: 'test' })
    })
  })

  describe('Comportamiento stale-while-revalidate', () => {
    it('debe retornar datos aunque estén cerca de expirar', () => {
      vi.useFakeTimers()
      
      const key = apiCache.generateKey('/api/test')
      apiCache.set(key, { data: 'test' }, 5000) // 5 segundos
      
      // Avanzar 4.5 segundos (todavía válido)
      vi.advanceTimersByTime(4500)
      
      const result = apiCache.get(key)
      expect(result).toEqual({ data: 'test' })
      
      vi.useRealTimers()
    })

    it('debe permitir actualización en background', () => {
      const key = apiCache.generateKey('/api/test')
      
      // Guardar datos iniciales
      apiCache.set(key, { version: 1 }, 60000)
      
      // Simular actualización en background
      setTimeout(() => {
        apiCache.set(key, { version: 2 }, 60000)
      }, 100)
      
      // Mientras tanto, los datos antiguos siguen disponibles
      expect(apiCache.get(key)).toEqual({ version: 1 })
    })
  })
})
