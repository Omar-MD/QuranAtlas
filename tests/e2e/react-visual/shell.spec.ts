import { expect, test } from '@playwright/test'

import { seedTargetState } from '../fixtures/react-golden-routes'

test('react shell visual baseline', async ({ page }) => {
  await seedTargetState(page, 'react', 'onboarded-last-surface-reader')
  await page.goto('/')
  await expect(page.locator('#react-root')).toBeVisible()
  await expect(page.getByRole('main', { name: /verse reader/i })).toBeVisible()
  await expect(page.getByTestId('verse-1:7')).toBeVisible()
  await expect(page.getByText(/Legacy app remains the shipped default/i)).toHaveCount(0)
  await expect(page).toHaveScreenshot('react-shell.png', {
    fullPage: true,
    animations: 'disabled',
  })
})
