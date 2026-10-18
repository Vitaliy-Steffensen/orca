import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { test, expect } from './helpers/orca-app'
import {
  activateGoldenWorktree,
  cleanupGoldenWorktree,
  createGoldenWorktree
} from './helpers/golden-source-control'
import { waitForSessionReady } from './helpers/store'

test('ticks files off in the PR diff viewer and unticks only the one that changed', async ({
  orcaPage,
  testRepoPath,
  registerPostElectronShutdownCleanup
}, testInfo) => {
  const fixture = createGoldenWorktree(testRepoPath, 'pr-diff-viewed')
  registerPostElectronShutdownCleanup(async () => cleanupGoldenWorktree(testRepoPath, fixture))
  const git = (args: string[]): void => {
    execFileSync('git', args, { cwd: fixture.worktreePath, stdio: 'pipe' })
  }
  const write = (name: string, body: string): void => {
    writeFileSync(path.join(fixture.worktreePath, name), body)
  }

  // Two files committed on the branch, so both differ from the base.
  write('alpha.ts', 'export const alpha = 1\n')
  write('beta.ts', 'export const beta = 1\n')
  git(['add', '.'])
  git(['commit', '-m', 'add alpha and beta'])

  await waitForSessionReady(orcaPage)
  // Why not the Source Control helper: it waits on the commit box, and this branch is clean.
  await activateGoldenWorktree(orcaPage, testRepoPath, fixture.worktreePath)
  await orcaPage.evaluate(() => {
    const state = window.__store?.getState()
    state?.setRightSidebarOpen(true)
    state?.setRightSidebarTab('pr-diff')
  })

  const row = (fileName: string) =>
    orcaPage
      .locator('[data-testid="pr-diff-file-list"] [data-source-control-path]')
      .filter({ hasText: fileName })
  const checkbox = (fileName: string) =>
    row(fileName).locator('[data-testid="branch-entry-viewed-checkbox"]')
  const changedDot = (fileName: string) =>
    row(fileName).locator('[data-testid="branch-entry-changed-since-viewed"]')
  const viewedCount = orcaPage.getByTestId('pr-diff-viewed-count')

  await expect(row('alpha.ts')).toBeVisible({ timeout: 20_000 })
  await expect(row('beta.ts')).toBeVisible()
  await expect(viewedCount).toHaveText('0/2 viewed')

  await checkbox('alpha.ts').click()
  await checkbox('beta.ts').click()
  await expect(checkbox('alpha.ts')).toHaveAttribute('data-state', 'checked')
  await expect(checkbox('beta.ts')).toHaveAttribute('data-state', 'checked')
  await expect(viewedCount).toHaveText('2/2 viewed')
  await testInfo.attach('pr-diff-both-ticked', {
    body: await orcaPage.screenshot(),
    contentType: 'image/png'
  })

  // Reloading the renderer proves the ticks came back off disk, not out of memory.
  await orcaPage.reload()
  await orcaPage.evaluate(() => {
    const state = window.__store?.getState()
    state?.setRightSidebarOpen(true)
    state?.setRightSidebarTab('pr-diff')
  })
  await expect(checkbox('alpha.ts')).toHaveAttribute('data-state', 'checked', { timeout: 30_000 })
  await expect(checkbox('beta.ts')).toHaveAttribute('data-state', 'checked')

  // A new commit touching only alpha.ts must leave beta.ts ticked.
  write('alpha.ts', 'export const alpha = 2\n')
  git(['commit', '-am', 'edit alpha only'])

  await expect(checkbox('alpha.ts')).toHaveAttribute('data-state', 'unchecked', {
    timeout: 30_000
  })
  await expect(changedDot('alpha.ts')).toBeVisible()
  await expect(checkbox('beta.ts')).toHaveAttribute('data-state', 'checked')
  await expect(changedDot('beta.ts')).toHaveCount(0)
  await expect(viewedCount).toHaveText('1/2 viewed')
  await testInfo.attach('pr-diff-alpha-unticked', {
    body: await orcaPage.screenshot(),
    contentType: 'image/png'
  })
})
