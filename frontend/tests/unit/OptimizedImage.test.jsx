import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import OptimizedImage from '../../src/components/OptimizedImage'

describe('OptimizedImage Component', () => {
  let consoleErrorSpy

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  it('should render an initial loading skeleton matching dimensions and hide the underlying image', () => {
    render(
      <OptimizedImage
        src="http://example.com/test-image.png"
        width={400}
        height={300}
        alt="Test Image"
      />
    )

    const skeleton = screen.getByTestId('optimized-image-skeleton')
    expect(skeleton).toBeDefined()
    expect(skeleton.className).toContain('animate-pulse')
    expect(skeleton.className).toContain('bg-gray-200')
    const container = skeleton.parentElement
    expect(container).toBeDefined()
    expect(container.style.aspectRatio).toBe('400 / 300')

    const image = screen.getByAltText('Test Image')
    expect(image).toBeDefined()
    expect(image.style.opacity).toBe('0')
  })

  it('should remove the skeleton and display the image when the primary source loads successfully', () => {
    render(
      <OptimizedImage
        src="http://example.com/test-image.png"
        width={400}
        height={300}
        alt="Test Image"
      />
    )

    const image = screen.getByAltText('Test Image')
    fireEvent.load(image)

    // The skeleton should be removed
    expect(screen.queryByTestId('optimized-image-skeleton')).toBeNull()
    expect(image.style.opacity).toBe('1')
  })

  it('should transition to the backend fallback on primary load error', () => {
    render(
      <OptimizedImage
        src="http://example.com/test-image.png"
        width={400}
        height={300}
        alt="Test Image"
      />
    )

    const image = screen.getByAltText('Test Image')
    expect(image.src).toBe('http://example.com/test-image.png')

    // Trigger error on primary image
    fireEvent.error(image)

    // The image src should point to backend default fallback
    // Since import.meta.env.VITE_BACK_URL is not set in test, it falls back to '/defaults/default-image.png'
    expect(image.src).toContain('/defaults/default-image.png')

    // The skeleton should still be visible because fallback is loading
    expect(screen.getByTestId('optimized-image-skeleton')).toBeDefined()
  })

  it('should transition to local SVG fallback if backend fallback fails', () => {
    render(
      <OptimizedImage
        src="http://example.com/test-image.png"
        width={400}
        height={300}
        alt="Test Image"
      />
    )

    const image = screen.getByAltText('Test Image')
    
    // 1st failure: Primary URL fails -> goes to backend fallback
    fireEvent.error(image)
    expect(image.src).toContain('/defaults/default-image.png')

    // 2nd failure: Backend fallback fails -> goes to local SVG fallback
    fireEvent.error(image)
    expect(image.src).toContain('data:image/svg+xml;base64')
  })

  it('should block retries and log terminal error to console if local SVG fails', () => {
    render(
      <OptimizedImage
        src="http://example.com/test-image.png"
        width={400}
        height={300}
        alt="Test Image"
      />
    )

    const image = screen.getByAltText('Test Image')

    // 1st failure: Primary URL fails -> goes to backend fallback
    fireEvent.error(image)

    // 2nd failure: Backend fallback fails -> goes to local SVG fallback
    fireEvent.error(image)
    const base64Src = image.src

    // 3rd failure: Local SVG fails -> terminal error
    fireEvent.error(image)

    // Verify it doesn't change src or attempt further transitions
    expect(image.src).toBe(base64Src)
    expect(consoleErrorSpy).toHaveBeenCalled()
    expect(consoleErrorSpy.mock.calls[0][0]).toContain('Terminal error')

    // Fire error one more time, verify it doesn't call console error or transition again
    const callCountBefore = consoleErrorSpy.mock.calls.length
    fireEvent.error(image)
    expect(consoleErrorSpy.mock.calls.length).toBe(callCountBefore)
  })

  it('should expose the current fallback status on the img element via data-status attribute across transitions', () => {
    render(
      <OptimizedImage
        src="http://example.com/test-image.png"
        width={400}
        height={300}
        alt="Test Status Image"
      />
    )

    const image = screen.getByAltText('Test Status Image')
    expect(image.getAttribute('data-status')).toBe('loading')

    // 1st failure: Primary URL fails -> goes to backend fallback
    fireEvent.error(image)
    expect(image.getAttribute('data-status')).toBe('fallback-backend')

    // 2nd failure: Backend fallback fails -> goes to local SVG fallback
    fireEvent.error(image)
    expect(image.getAttribute('data-status')).toBe('fallback-local')

    // 3rd failure: Local SVG fails -> terminal error
    fireEvent.error(image)
    expect(image.getAttribute('data-status')).toBe('terminal-error')
  })
})
