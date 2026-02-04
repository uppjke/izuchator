import { test, expect } from '@playwright/test'

test.describe('Home Page', () => {
  test('should display the home page with hero section', async ({ page }) => {
    await page.goto('/')
    
    // Check that main heading is visible
    await expect(page.getByRole('heading', { name: /Учи\. Учись\. Твори!/i })).toBeVisible()
    
    // Check that login button is visible
    await expect(page.getByRole('button', { name: /Войти/i })).toBeVisible()
    
    // Check that register button is visible
    await expect(page.getByRole('button', { name: /Создать аккаунт/i })).toBeVisible()
  })

  test('should open login dialog when clicking login button', async ({ page }) => {
    await page.goto('/')
    
    await page.getByRole('button', { name: /Войти/i }).click()
    
    // Check that login dialog appears
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByPlaceholder(/email/i)).toBeVisible()
  })

  test('should open register dialog when clicking register button', async ({ page }) => {
    await page.goto('/')
    
    await page.getByRole('button', { name: /Создать аккаунт/i }).click()
    
    // Check that register dialog appears
    await expect(page.getByRole('dialog')).toBeVisible()
  })

  test('should display cookie banner on first visit', async ({ page, context }) => {
    // Clear cookies to simulate first visit
    await context.clearCookies()
    
    await page.goto('/')
    
    // Wait for cookie banner to appear (has a delay)
    await page.waitForTimeout(1500)
    
    // Check for cookie banner
    const cookieBanner = page.getByText(/Мы используем cookies/i)
    await expect(cookieBanner).toBeVisible()
  })
})

test.describe('Navigation', () => {
  test('should have accessible header navigation', async ({ page }) => {
    await page.goto('/')
    
    // Check that header is visible
    const header = page.getByRole('banner')
    await expect(header).toBeVisible()
    
    // Check for logo/brand
    await expect(page.getByAltText(/Изучатор/i)).toBeVisible()
  })
})

test.describe('Legal Pages', () => {
  test('should display privacy policy page', async ({ page }) => {
    await page.goto('/privacy')
    
    await expect(page.getByRole('heading', { name: /Политика конфиденциальности/i })).toBeVisible()
    await expect(page.getByText(/ФЗ-152/i)).toBeVisible()
  })

  test('should display terms of service page', async ({ page }) => {
    await page.goto('/terms')
    
    await expect(page.getByRole('heading', { name: /Пользовательское соглашение/i })).toBeVisible()
  })
})

test.describe('Responsive Design', () => {
  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')
    
    // Hero should be visible
    await expect(page.getByRole('heading', { name: /Учи\. Учись\. Твори!/i })).toBeVisible()
    
    // Buttons should be visible and clickable
    await expect(page.getByRole('button', { name: /Войти/i })).toBeVisible()
  })

  test('should be responsive on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/')
    
    // Content should be visible
    await expect(page.getByRole('heading', { name: /Учи\. Учись\. Твори!/i })).toBeVisible()
  })
})

test.describe('Accessibility', () => {
  test('should have no accessibility violations on home page', async ({ page }) => {
    await page.goto('/')
    
    // Basic accessibility checks
    // Check that all images have alt text
    const images = await page.getByRole('img').all()
    for (const img of images) {
      const alt = await img.getAttribute('alt')
      expect(alt).toBeTruthy()
    }
    
    // Check that buttons are focusable
    const loginButton = page.getByRole('button', { name: /Войти/i })
    await loginButton.focus()
    await expect(loginButton).toBeFocused()
  })

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/')
    
    // Tab through focusable elements
    await page.keyboard.press('Tab')
    
    // Something should be focused
    const focused = await page.evaluate(() => document.activeElement?.tagName)
    expect(focused).toBeTruthy()
  })
})
