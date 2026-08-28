import { expect, test } from '@playwright/test'

test.describe('public and auth entry flows', () => {
  test('homepage exposes the main entry paths', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Shared-house accounting')
    await expect(page.getByRole('link', { name: /start as manager/i }).first()).toHaveAttribute('href', '/register/manager')
    await expect(page.getByRole('link', { name: /join with flat code/i }).first()).toHaveAttribute('href', '/join')
    await expect(page.getByRole('link', { name: /open interactive demo/i })).toHaveAttribute('href', '/demo')
  })

  test('get started leads to the account type choice', async ({ page }) => {
    await page.goto('/')
    await page.locator('header').getByRole('link', { name: /get started/i }).click()

    await expect(page).toHaveURL(/\/account-type$/)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Do you manage the mess')
    await expect(page.getByRole('link', { name: /start as manager/i })).toHaveAttribute('href', '/register/manager')
    await expect(page.getByRole('link', { name: /join with flat code/i })).toHaveAttribute('href', '/join')
  })

  test('login page presents the OTP sign-in form', async ({ page }) => {
    await page.goto('/login')

    await expect(page.getByRole('heading', { name: /log in or create your account/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /email/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /phone/i })).toBeVisible()
  })

  test('unauthenticated app access is redirected to login', async ({ page }) => {
    await page.goto('/dashboard')

    await expect(page).toHaveURL(/\/login(?:\?.*)?$/)
    await expect(page.getByRole('heading', { name: /log in or create your account/i })).toBeVisible()
  })

  test('language toggle updates the document language', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'বাং' }).click()

    await expect(page.locator('html')).toHaveAttribute('lang', 'bn')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('মেসের হিসাব')
  })
})
