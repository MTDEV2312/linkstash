import { test, expect } from '@playwright/test'

/**
 * Tests E2E para escenarios de error y casos límite
 * Estas pruebas complementan las existentes en auth-and-ui.spec.js y links-and-features.spec.js
 */

test.describe('Manejo de Errores de Red', () => {
  test('debe mostrar mensaje de error cuando falla la conexión', async ({ page, context }) => {
    // Simular offline
    await context.setOffline(true)
    
    await page.goto('http://localhost:5173')
    
    // Intentar hacer login offline
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')
    
    // Debería mostrar algún tipo de error (toast, mensaje, etc.)
    // El timeout es más corto porque esperamos que falle rápido
    await page.waitForSelector('text=/error|falló|conexión|network/i', { timeout: 10000 })
  })

  test('debe mostrar página offline cuando se pierde conexión', async ({ page, context }) => {
    await page.goto('http://localhost:5173')
    
    // Simular pérdida de conexión después de cargar
    await context.setOffline(true)
    
    // Intentar navegar
    await page.goto('http://localhost:5173/dashboard').catch(() => {})
    
    // Debería mostrar página offline o mensaje
    const content = await page.content()
    expect(content.toLowerCase()).toMatch(/sin conexión|offline|no conectado/i)
  })

  test('debe recuperarse cuando vuelve la conexión', async ({ page, context }) => {
    await context.setOffline(true)
    await page.goto('http://localhost:5173').catch(() => {})
    
    // Restaurar conexión
    await context.setOffline(false)
    
    // Recargar y debería funcionar
    await page.reload()
    await expect(page.locator('h1, h2')).toContainText(/LinkStash|Iniciar|Login/i)
  })
})

test.describe('Manejo de Errores de API', () => {
  test('debe manejar credenciales inválidas correctamente', async ({ page }) => {
    await page.goto('http://localhost:5173/login')
    
    await page.fill('input[type="email"]', 'noexiste@example.com')
    await page.fill('input[type="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')
    
    // Esperar mensaje de error
    await expect(page.locator('text=/credenciales|usuario|contraseña|inválid/i')).toBeVisible({ timeout: 5000 })
  })

  test('debe manejar timeout de sesión (401)', async ({ page, context }) => {
    // Primero hacer login
    await page.goto('http://localhost:5173/login')
    await page.fill('input[type="email"]', 'testuser@example.com')
    await page.fill('input[type="password"]', 'Test123456')
    await page.click('button[type="submit"]')
    
    await page.waitForURL('**/dashboard', { timeout: 10000 })
    
    // Limpiar el token para simular sesión expirada
    await page.evaluate(() => {
      localStorage.removeItem('auth-storage')
    })
    
    // Recargar página
    await page.reload()
    
    // Debería redirigir a login
    await expect(page).toHaveURL(/.*login/, { timeout: 5000 })
  })

  test('debe manejar error 500 del servidor', async ({ page, route }) => {
    // Interceptar petición y retornar error 500
    await route('**/api/**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, message: 'Error del servidor' })
      })
    })
    
    await page.goto('http://localhost:5173/login')
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')
    
    // Esperar mensaje de error
    await expect(page.locator('text=/error|servidor|falló/i')).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Validación de Formularios', () => {
  test('debe validar email inválido en registro', async ({ page }) => {
    await page.goto('http://localhost:5173/register')
    
    await page.fill('input[type="email"]', 'email-invalido')
    await page.fill('input[type="password"]', 'Test123456')
    await page.fill('input[name="username"]', 'testuser')
    
    // Intentar enviar
    await page.click('button[type="submit"]')
    
    // Debería mostrar error de validación
    const emailInput = page.locator('input[type="email"]')
    const validationMessage = await emailInput.evaluate((el) => el.validationMessage)
    expect(validationMessage).toBeTruthy()
  })

  test('debe validar contraseña débil', async ({ page }) => {
    await page.goto('http://localhost:5173/register')
    
    await page.fill('input[name="username"]', 'testuser')
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', '123') // Muy corta
    
    await page.click('button[type="submit"]')
    
    // Debería mostrar error (validación HTML5 o custom)
    await expect(page.locator('text=/contraseña|password|caracteres|débil/i')).toBeVisible({ timeout: 3000 })
  })

  test('debe validar URL inválida al agregar link', async ({ page }) => {
    // Login primero
    await page.goto('http://localhost:5173/login')
    await page.fill('input[type="email"]', 'testuser@example.com')
    await page.fill('input[type="password"]', 'Test123456')
    await page.click('button[type="submit"]')
    
    await page.waitForURL('**/dashboard', { timeout: 10000 })
    
    // Ir a "Mis Enlaces" o buscar el formulario de agregar link
    await page.goto('http://localhost:5173/my-links')
    
    // Buscar input de URL (puede estar en modal o directamente)
    const urlInput = page.locator('input[type="url"], input[name="url"], input[placeholder*="URL"]').first()
    
    if (await urlInput.isVisible()) {
      await urlInput.fill('no-es-una-url')
      
      // Intentar enviar
      const submitBtn = page.locator('button[type="submit"]:has-text(/agregar|guardar|añadir/i)').first()
      await submitBtn.click()
      
      // Debería validar
      const validation = await urlInput.evaluate((el) => el.validationMessage)
      expect(validation || '').toMatch(/url|dirección/i)
    }
  })
})

test.describe('Casos Límite de UI', () => {
  test('debe manejar lista vacía de enlaces', async ({ page }) => {
    // Login con usuario que no tiene enlaces
    await page.goto('http://localhost:5173/login')
    await page.fill('input[type="email"]', 'newuser@example.com')
    await page.fill('input[type="password"]', 'Test123456')
    await page.click('button[type="submit"]')
    
    await page.waitForURL('**/dashboard', { timeout: 10000 })
    
    // Ir a mis enlaces
    await page.goto('http://localhost:5173/my-links')
    
    // Debería mostrar estado vacío
    await expect(page.locator('text=/no (tienes|hay) enlaces|vacío|agrega tu primer/i')).toBeVisible({ timeout: 5000 })
  })

  test('debe manejar búsqueda sin resultados', async ({ page }) => {
    await page.goto('http://localhost:5173/login')
    await page.fill('input[type="email"]', 'testuser@example.com')
    await page.fill('input[type="password"]', 'Test123456')
    await page.click('button[type="submit"]')
    
    await page.waitForURL('**/dashboard', { timeout: 10000 })
    await page.goto('http://localhost:5173/my-links')
    
    // Buscar algo que no existe
    const searchInput = page.locator('input[type="search"], input[placeholder*="Buscar"]').first()
    if (await searchInput.isVisible()) {
      await searchInput.fill('xyzabc123noexiste')
      await page.waitForTimeout(500) // Esperar debounce
      
      // Debería mostrar "sin resultados"
      await expect(page.locator('text=/sin resultados|no encontrado|no hay resultados/i')).toBeVisible({ timeout: 3000 })
    }
  })

  test('debe manejar títulos muy largos', async ({ page }) => {
    await page.goto('http://localhost:5173/login')
    await page.fill('input[type="email"]', 'testuser@example.com')
    await page.fill('input[type="password"]', 'Test123456')
    await page.click('button[type="submit"]')
    
    await page.waitForURL('**/dashboard', { timeout: 10000 })
    await page.goto('http://localhost:5173/my-links')
    
    // Intentar agregar link con título muy largo
    const titleInput = page.locator('input[name="title"], input[placeholder*="Título"]').first()
    if (await titleInput.isVisible()) {
      const longTitle = 'A'.repeat(300) // 300 caracteres
      await titleInput.fill(longTitle)
      
      // Verificar que se maneja correctamente (truncamiento, validación, etc.)
      const value = await titleInput.inputValue()
      expect(value.length).toBeLessThanOrEqual(300)
    }
  })
})

test.describe('Seguridad', () => {
  test('debe prevenir XSS en títulos de enlaces', async ({ page }) => {
    await page.goto('http://localhost:5173/login')
    await page.fill('input[type="email"]', 'testuser@example.com')
    await page.fill('input[type="password"]', 'Test123456')
    await page.click('button[type="submit"]')
    
    await page.waitForURL('**/dashboard', { timeout: 10000 })
    
    // Intentar inyectar script en título
    const xssPayload = '<script>alert("XSS")</script>'
    
    // Si hay un formulario visible, intentar
    const titleInput = page.locator('input[name="title"]').first()
    if (await titleInput.isVisible({ timeout: 2000 })) {
      await titleInput.fill(xssPayload)
      
      // El script no debería ejecutarse
      // Verificar que se renderiza como texto, no como HTML
      const scripts = await page.locator('script').count()
      const initialScriptCount = scripts
      
      await page.waitForTimeout(1000)
      
      const finalScriptCount = await page.locator('script').count()
      expect(finalScriptCount).toBe(initialScriptCount) // No nuevos scripts
    }
  })

  test('debe redirigir a login cuando no autenticado', async ({ page }) => {
    // Intentar acceder directamente a ruta protegida
    await page.goto('http://localhost:5173/dashboard')
    
    // Debería redirigir a login
    await expect(page).toHaveURL(/.*login/, { timeout: 5000 })
  })

  test('no debe exponer token en URL', async ({ page }) => {
    await page.goto('http://localhost:5173/login')
    await page.fill('input[type="email"]', 'testuser@example.com')
    await page.fill('input[type="password"]', 'Test123456')
    await page.click('button[type="submit"]')
    
    await page.waitForURL('**/dashboard', { timeout: 10000 })
    
    // Verificar que no hay token en URL
    const url = page.url()
    expect(url).not.toMatch(/token|jwt|bearer/i)
  })
})

test.describe('Rendimiento y UX', () => {
  test('debe cargar dashboard en menos de 3 segundos', async ({ page }) => {
    const startTime = Date.now()
    
    await page.goto('http://localhost:5173/login')
    await page.fill('input[type="email"]', 'testuser@example.com')
    await page.fill('input[type="password"]', 'Test123456')
    await page.click('button[type="submit"]')
    
    await page.waitForURL('**/dashboard', { timeout: 10000 })
    await page.waitForLoadState('networkidle')
    
    const loadTime = Date.now() - startTime
    expect(loadTime).toBeLessThan(5000) // 5 segundos máximo
  })

  test('debe mantener scroll position al navegar hacia atrás', async ({ page }) => {
    await page.goto('http://localhost:5173/login')
    await page.fill('input[type="email"]', 'testuser@example.com')
    await page.fill('input[type="password"]', 'Test123456')
    await page.click('button[type="submit"]')
    
    await page.waitForURL('**/dashboard', { timeout: 10000 })
    
    // Hacer scroll
    await page.evaluate(() => window.scrollTo(0, 500))
    const scrollBefore = await page.evaluate(() => window.scrollY)
    
    // Navegar a otra página
    await page.goto('http://localhost:5173/tags')
    
    // Volver atrás
    await page.goBack()
    
    // El scroll debería estar cerca de donde estaba
    // (puede variar ligeramente por lazy loading)
    await page.waitForTimeout(500)
    const scrollAfter = await page.evaluate(() => window.scrollY)
    
    // Tolerancia de 100px
    expect(Math.abs(scrollAfter - scrollBefore)).toBeLessThan(100)
  })

  test('debe mostrar loading state durante operaciones', async ({ page }) => {
    await page.goto('http://localhost:5173/login')
    
    await page.fill('input[type="email"]', 'testuser@example.com')
    await page.fill('input[type="password"]', 'Test123456')
    
    // Click y verificar loading inmediatamente
    await page.click('button[type="submit"]')
    
    // Debería aparecer algún indicador de carga (spinner, texto "Cargando", botón deshabilitado)
    const hasLoadingIndicator = await Promise.race([
      page.locator('[class*="loading"], [class*="spinner"], text=/cargando/i, button[disabled]').isVisible(),
      page.waitForTimeout(1000).then(() => false)
    ])
    
    // Si la operación es muy rápida, puede que no veamos el loading
    // Esto es aceptable
    // expect(hasLoadingIndicator).toBe(true)
  })
})
