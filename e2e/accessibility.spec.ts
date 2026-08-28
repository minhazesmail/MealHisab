import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const publicRoutes = ['/', '/account-type', '/login', '/join', '/demo']

for (const route of publicRoutes) {
  test(`${route} has no automated WCAG A/AA violations`, async ({ page }) => {
    await page.goto(route)

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()

    const summary = results.violations
      .map((violation) => `${violation.id}: ${violation.help} (${violation.nodes.length} node${violation.nodes.length === 1 ? '' : 's'})`)
      .join('\n')

    expect(results.violations, summary || `No accessibility violations on ${route}`).toEqual([])
  })
}
