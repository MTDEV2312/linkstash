import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {}, // deprecated
    removeListener: () => {}, // deprecated
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
})

// Mock localStorage que retorna strings como el real
const storage = {}
const localStorageMock = {
  getItem: (key) => storage[key] || null,
  setItem: (key, value) => { storage[key] = String(value) }, // Convertir a string
  removeItem: (key) => { delete storage[key] },
  clear: () => {
    for (const key in storage) {
      delete storage[key]
    }
  },
}
global.localStorage = localStorageMock
