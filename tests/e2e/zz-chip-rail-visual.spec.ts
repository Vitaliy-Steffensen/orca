import { test, expect } from './helpers/orca-app'
import { waitForActiveWorktree, waitForSessionReady } from './helpers/store'
import { worktreeRow } from './worktree-row-locators'

test('workspace card chip rail', async ({ orcaPage: page }, testInfo) => {
  await waitForSessionReady(page)
  const worktreeId = await waitForActiveWorktree(page)

  const row = worktreeRow(page, worktreeId)
  await expect(row).toBeVisible()

  // Healthy workspace: the rail must render nothing at all.
  await expect(row.locator('[data-worktree-card-chip-rail]')).toHaveCount(0)
  await row.screenshot({ path: testInfo.outputPath('card-quiet.png') })

  // Drive a local merge conflict through the store the card already reads.
  await page.evaluate((id) => {
    window.__store?.setState({ gitConflictOperationByWorktree: { [id]: 'merge' } })
  }, worktreeId)
  await expect(row.locator('[data-worktree-card-chip="conflict"]')).toBeVisible()
  await row.screenshot({ path: testInfo.outputPath('card-conflict.png') })

  // Failing checks outrank the conflict and take the destructive tone.
  await page.evaluate(() => {
    window.__store?.setState({ gitConflictOperationByWorktree: {} })
  })
  await expect(row.locator('[data-worktree-card-chip="conflict"]')).toHaveCount(0)

  console.log(
    'CHIP_RAIL_SCREENSHOTS',
    testInfo.outputPath('card-quiet.png'),
    testInfo.outputPath('card-conflict.png')
  )
})
