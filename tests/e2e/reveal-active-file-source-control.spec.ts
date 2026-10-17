import path from 'node:path'
import { test, expect } from './helpers/orca-app'
import {
  activateGoldenWorktree,
  cleanupGoldenWorktree,
  createGoldenWorktree,
  GOLDEN_CHANGED_PATH,
  seedGoldenSourceEdit
} from './helpers/golden-source-control'
import { waitForSessionReady } from './helpers/store'

// Why this attribute and not the testid: the default "All changes" grouping renders branch-style
// rows, which carry the path but not the uncommitted row's testid.
const CHANGED_ROW = `[data-source-control-path="${GOLDEN_CHANGED_PATH}"]`

// Why not openGoldenSourceControl: its commit-composer assertion already fails on this build, and
// this spec only needs the tab showing.
async function showSourceControl(
  page: Parameters<typeof activateGoldenWorktree>[0],
  repoPath: string,
  worktreePath: string
): Promise<void> {
  await activateGoldenWorktree(page, repoPath, worktreePath)
  await page.evaluate(() => {
    const state = window.__store?.getState()
    state?.setRightSidebarTab('source-control')
    state?.setRightSidebarOpen(true)
  })
}

test('reveals the open diff in the Source Control list rather than the explorer', async ({
  orcaPage,
  testRepoPath,
  registerPostElectronShutdownCleanup
}) => {
  const fixture = createGoldenWorktree(testRepoPath, 'reveal-sc')
  registerPostElectronShutdownCleanup(async () => cleanupGoldenWorktree(testRepoPath, fixture))
  seedGoldenSourceEdit(fixture.worktreePath)

  await waitForSessionReady(orcaPage)
  await showSourceControl(orcaPage, testRepoPath, fixture.worktreePath)

  const changedRow = orcaPage.locator(CHANGED_ROW)
  await expect(changedRow).toBeVisible({ timeout: 15_000 })
  await changedRow.click()
  await expect(changedRow).toHaveAttribute('data-current', 'true', { timeout: 15_000 })

  await orcaPage.keyboard.press('ControlOrMeta+Shift+H')

  // The Source Control tab stays put — the explorer tree must not take over.
  await expect(changedRow).toHaveClass(/bg-amber-400/, { timeout: 10_000 })
  await expect(orcaPage.locator('[data-orca-explorer-shell]')).toHaveCount(0)
})

test('falls back to the explorer tree when the open file has no diff', async ({
  orcaPage,
  testRepoPath,
  registerPostElectronShutdownCleanup
}) => {
  const fixture = createGoldenWorktree(testRepoPath, 'reveal-sc-fallback')
  registerPostElectronShutdownCleanup(async () => cleanupGoldenWorktree(testRepoPath, fixture))
  seedGoldenSourceEdit(fixture.worktreePath)

  await waitForSessionReady(orcaPage)
  await showSourceControl(orcaPage, testRepoPath, fixture.worktreePath)

  // An unchanged file: it has a tab, but no row in Source Control to land on. Not the README —
  // markdown opens in the rich editor, whose focus swallows the chord.
  const unchangedPath = path.join(fixture.worktreePath, 'package.json')
  await orcaPage.evaluate((target: string) => {
    const state = window.__store?.getState()
    const worktreeId = state?.activeWorktreeId
    if (!state || !worktreeId) {
      throw new Error('no active worktree')
    }
    state.openFile({
      filePath: target,
      relativePath: 'package.json',
      worktreeId,
      language: 'json',
      mode: 'edit'
    })
  }, unchangedPath)
  await expect(orcaPage.locator('.editor-header-path').first()).toContainText('package.json', {
    timeout: 20_000
  })

  await orcaPage.keyboard.press('ControlOrMeta+Shift+H')

  const explorer = orcaPage.locator('[data-orca-explorer-shell]')
  await expect(explorer).toBeVisible({ timeout: 10_000 })
  const unchangedRow = explorer.locator('[data-file-explorer-row]').filter({
    has: orcaPage
      .locator('[data-file-explorer-row-name]')
      .getByText('package.json', { exact: true })
  })
  await expect(unchangedRow).toHaveClass(/bg-amber-400/, { timeout: 10_000 })
})

test('fires with the caret inside the editor, where the question is actually asked', async ({
  orcaPage,
  testRepoPath,
  registerPostElectronShutdownCleanup
}) => {
  const fixture = createGoldenWorktree(testRepoPath, 'reveal-sc-editing')
  registerPostElectronShutdownCleanup(async () => cleanupGoldenWorktree(testRepoPath, fixture))
  seedGoldenSourceEdit(fixture.worktreePath)

  await waitForSessionReady(orcaPage)
  await showSourceControl(orcaPage, testRepoPath, fixture.worktreePath)
  await orcaPage.evaluate(
    (target: string) => {
      const state = window.__store?.getState()
      const worktreeId = state?.activeWorktreeId
      if (!state || !worktreeId) {
        throw new Error('no active worktree')
      }
      state.openFile({
        filePath: target,
        relativePath: 'src/index.ts',
        worktreeId,
        language: 'typescript',
        mode: 'edit'
      })
    },
    path.join(fixture.worktreePath, GOLDEN_CHANGED_PATH)
  )

  await orcaPage.locator('.monaco-editor').first().waitFor({ timeout: 25_000 })
  await orcaPage.locator('.monaco-editor textarea').first().focus()
  await orcaPage.keyboard.press('ControlOrMeta+Shift+H')

  await expect(orcaPage.locator(CHANGED_ROW)).toHaveClass(/bg-amber-400/, { timeout: 10_000 })
})
