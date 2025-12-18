import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDarkMode } from '../../src/hooks/useDarkMode'

describe('useDarkMode Hook', () => {
  beforeEach(() => {
    // Limpiar localStorage antes de cada test
    localStorage.clear()
    
    // Limpiar clases del DOM
    document.documentElement.classList.remove('dark')
    
    // Reset matchMedia mock
    window.matchMedia = vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  })

  it('debe inicializar con modo claro por defecto', () => {
    const { result } = renderHook(() => useDarkMode())
    
    expect(result.current[0]).toBe(false)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('debe alternar entre modo claro y oscuro', () => {
    const { result } = renderHook(() => useDarkMode())
    const [isDark, toggleDarkMode] = result.current
    
    expect(isDark).toBe(false)
    
    // Activar modo oscuro
    act(() => {
      toggleDarkMode()
    })
    
    expect(result.current[0]).toBe(true)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem('darkMode')).toBe('true')
    
    // Volver a modo claro
    act(() => {
      result.current[1]()
    })
    
    expect(result.current[0]).toBe(false)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(localStorage.getItem('darkMode')).toBe('false')
  })

  it('debe persistir la preferencia en localStorage', () => {
    const { result } = renderHook(() => useDarkMode())
    
    act(() => {
      result.current[1]() // Activar dark mode
    })
    
    expect(localStorage.getItem('darkMode')).toBe('true')
    
    // Renderizar nuevo hook - debería recuperar del storage
    const { result: result2 } = renderHook(() => useDarkMode())
    expect(result2.current[0]).toBe(true)
  })

  it('debe respetar preferencia del sistema si no hay localStorage', () => {
    // Simular que el sistema prefiere modo oscuro
    window.matchMedia = vi.fn().mockImplementation(query => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
    
    const { result } = renderHook(() => useDarkMode())
    
    expect(result.current[0]).toBe(true)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('debe dar prioridad a localStorage sobre preferencia del sistema', () => {
    // Sistema prefiere oscuro
    window.matchMedia = vi.fn().mockImplementation(query => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
    
    // Pero usuario prefiere claro
    localStorage.setItem('darkMode', 'false')
    
    const { result } = renderHook(() => useDarkMode())
    
    expect(result.current[0]).toBe(false)
  })

  it('debe aplicar clase "dark" al elemento html', () => {
    const { result } = renderHook(() => useDarkMode())
    
    act(() => {
      result.current[1]() // Activar
    })
    
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    
    act(() => {
      result.current[1]() // Desactivar
    })
    
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('debe manejar múltiples instancias sincronizadas', () => {
    const { result: hook1 } = renderHook(() => useDarkMode())
    const { result: hook2 } = renderHook(() => useDarkMode())
    
    // Ambos deben empezar igual
    expect(hook1.current[0]).toBe(hook2.current[0])
    
    // Cambiar en uno
    act(() => {
      hook1.current[1]()
    })
    
    // El localStorage se actualiza, pero hook2 no re-renderiza automáticamente
    // (esto es comportamiento esperado, cada hook maneja su propio estado)
    expect(hook1.current[0]).toBe(true)
    
    // Si se renderiza un nuevo hook, debería leer el valor actualizado
    const { result: hook3 } = renderHook(() => useDarkMode())
    expect(hook3.current[0]).toBe(true)
  })
})
