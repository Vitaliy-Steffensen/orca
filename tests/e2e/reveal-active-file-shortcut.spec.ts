import path from 'node:path'
import { test, expect } from './helpers/orca-app'
import {
  activateGoldenWorktree,
  cleanupGoldenWorktree,
  createGoldenWorktree,
  GOLDEN_CHANGED_PATH
} from './helpers/golden-source-control'
import { waitForSessionReady } from './helpers/store'

const CHANGED_DIR = path.posix.dirname(GOLDEN_CHANGED_PATH)
const CHANGED_NAME = path.posix.basename(GOLDEN_CHANGED_PATH)

test('reveals the active file in the explorer from another sidebar tab', async ({
  orcaPage,
  testRepoPath,
  registerPostElectronShutdownCleanup
}) => {
  const fixture = createGoldenWorktree(testRepoPath, 'reveal-shortcut')
  registerPostElectronShutdownCleanup(async () => cleanupGoldenWorktree(testRepoPath, fixture))

  await waitForSessionReady(orcaPage)
  await activateGoldenWorktree(orcaPage, testRepoPath, fixture.worktreePath)
  await orcaPage.evaluate(() => {
    const state = window.__store?.getState()
    state?.setRightSidebarTab('explorer')
    state?.setRightSidebarOpen(true)
  })

  const explorer = orcaPage.locator('[data-orca-explorer-shell]')
  const row = (name: string) =>
    explorer.locator('[data-file-explorer-row]').filter({
      has: orcaPage.locator('[data-file-explorer-row-name]').getByText(name, { exact: true })
    })

  const dirRow = row(CHANGED_DIR)
  await expect(dirRow).toBeVisible({ timeout: 15_000 })
  await dirRow.click()
  const fileRow = row(CHANGED_NAME)
  await expect(fileRow).toBeVisible({ timeout: 10_000 })
  await fileRow.click()
  await expect(orcaPage.locator('.editor-header-path').first()).toContainText(CHANGED_NAME, {
    timeout: 20_000
  })

  // Collapse the file's folder and leave the Explorer, so the reveal has real work to do.
  await dirRow.click()
  await expect(fileRow).toHaveCount(0)
  await orcaPage.evaluate(() => window.__store?.getState()?.setRightSidebarTab('source-control'))
  await expect(explorer).toHaveCount(0)

  await orcaPage.keyboard.press('ControlOrMeta+Shift+H')

  await expect(explorer).toBeVisible({ timeout: 10_000 })
  await expect(fileRow).toBeVisible({ timeout: 10_000 })
  await expect(fileRow).toHaveClass(/bg-amber-400/)
})
