import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { test, expect } from './helpers/orca-app'
import {
  activateGoldenWorktree,
  cleanupGoldenWorktree,
  createGoldenWorktree
} from './helpers/golden-source-control'
import { waitForSessionReady } from './helpers/store'

test.use({ launchEnv: { ORCA_BACKGROUND_LAUNCH: '1' } })

function saveShot(
  page: { screenshot: (options: { path: string }) => Promise<Buffer> },
  name: string
) {
  mkdirSync('.context', { recursive: true })
  return page.screenshot({ path: path.join('.context', name) })
}

test('ticks files off in Changes and unticks only the one that changed', async ({
  orcaPage,
  testRepoPath,
  registerPostElectronShutdownCleanup
}, testInfo) => {
  const fixture = createGoldenWorktree(testRepoPath, 'source-control-viewed')
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
    state?.setRightSidebarTab('source-control')
  })

  const row = (fileName: string) =>
    orcaPage
      .locator('[data-testid="source-control-changes-section"] [data-source-control-path]')
      .filter({ hasText: fileName })
  const checkbox = (fileName: string) =>
    row(fileName).locator('[data-testid="branch-entry-viewed-checkbox"]')
  const changedDot = (fileName: string) =>
    row(fileName).locator('[data-testid="branch-entry-changed-since-viewed"]')
  const viewedCount = orcaPage.getByTestId('source-control-viewed-count')

  await expect(row('alpha.ts')).toBeVisible({ timeout: 20_000 })
  await expect(row('beta.ts')).toBeVisible()
  await expect(viewedCount).toHaveText('0/2 viewed')

  await checkbox('alpha.ts').click()
  await checkbox('beta.ts').click()
  await expect(checkbox('alpha.ts')).toHaveAttribute('data-state', 'checked')
  await expect(checkbox('beta.ts')).toHaveAttribute('data-state', 'checked')
  await expect(viewedCount).toHaveText('2/2 viewed')
  await saveShot(orcaPage, 'source-control-both-ticked.png')
  await testInfo.attach('source-control-both-ticked', {
    body: await orcaPage.screenshot(),
    contentType: 'image/png'
  })

  // Reloading the renderer proves the ticks came back off disk, not out of memory.
  await orcaPage.reload()
  await orcaPage.evaluate(() => {
    const state = window.__store?.getState()
    state?.setRightSidebarOpen(true)
    state?.setRightSidebarTab('source-control')
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
  await saveShot(orcaPage, 'source-control-alpha-unticked.png')
  await testInfo.attach('source-control-alpha-unticked', {
    body: await orcaPage.screenshot(),
    contentType: 'image/png'
  })
})

test('shows Changes, Staged and Unstaged together, and keeps a hidden section hidden', async ({
  orcaPage,
  testRepoPath,
  registerPostElectronShutdownCleanup
}) => {
  const fixture = createGoldenWorktree(testRepoPath, 'source-control-sections')
  registerPostElectronShutdownCleanup(async () => cleanupGoldenWorktree(testRepoPath, fixture))
  const git = (args: string[]): void => {
    execFileSync('git', args, { cwd: fixture.worktreePath, stdio: 'pipe' })
  }
  const write = (name: string, body: string): void => {
    writeFileSync(path.join(fixture.worktreePath, name), body)
  }
  const tracked = execFileSync('git', ['ls-files'], {
    cwd: fixture.worktreePath,
    encoding: 'utf8'
  })
    .split('\n')
    .find((filePath) => filePath.length > 0)
  if (!tracked) {
    throw new Error('seed repo has no tracked files')
  }

  write('committed.ts', 'export const committed = 1\n')
  git(['add', 'committed.ts'])
  git(['commit', '-m', 'add committed'])
  write('staged.ts', 'export const staged = 1\n')
  git(['add', 'staged.ts'])
  write(
    tracked,
    `${execFileSync('git', ['show', `HEAD:${tracked}`], { cwd: fixture.worktreePath, encoding: 'utf8' })}// unstaged\n`
  )
  write('untracked.ts', 'export const untracked = 1\n')

  await waitForSessionReady(orcaPage)
  await activateGoldenWorktree(orcaPage, testRepoPath, fixture.worktreePath)
  await orcaPage.evaluate(() => {
    const state = window.__store?.getState()
    state?.setRightSidebarOpen(true)
    state?.setRightSidebarTab('source-control')
  })

  const header = (label: string) => orcaPage.locator(`span[title="${label}"]`)
  await expect(header('Changes')).toBeVisible({ timeout: 20_000 })
  await expect(header('Staged Changes')).toBeVisible()
  await expect(header('Unstaged Changes')).toBeVisible()
  await expect(header('Untracked Files')).toHaveCount(0)
  await expect(header('Committed')).toHaveCount(0)
  await expect(orcaPage.getByTitle('PR Diff Viewer')).toHaveCount(0)

  const unstagedRow = orcaPage.locator(
    `[data-source-control-area="unstaged"][data-source-control-path="${tracked}"]`
  )
  const untrackedRow = orcaPage.locator(
    '[data-source-control-area="untracked"][data-source-control-path="untracked.ts"]'
  )
  await expect(unstagedRow).toBeVisible()
  await expect(untrackedRow).toBeVisible()
  await expect(untrackedRow.getByRole('button', { name: 'Delete untracked file' })).toBeVisible()
  await expect(orcaPage.getByRole('button', { name: 'Delete all untracked' })).toBeVisible()
  await expect(orcaPage.getByRole('button', { name: 'Discard all' }).first()).toBeVisible()
  await expect(orcaPage.getByRole('button', { name: 'Stage all' }).first()).toBeVisible()
  await saveShot(orcaPage, 'source-control-three-sections.png')

  // Command-click opens a split. The row context menu is what selects a file for the bulk bar.
  await unstagedRow.click({ button: 'right' })
  await expect(orcaPage.getByText('1 selected')).toBeVisible()
  await saveShot(orcaPage, 'source-control-bulk-bar.png')
  await orcaPage.keyboard.press('Escape')

  await orcaPage.getByRole('button', { name: 'Stage all', exact: true }).click()
  await expect(
    orcaPage.locator('[data-source-control-area="staged"][data-source-control-path="untracked.ts"]')
  ).toBeVisible({ timeout: 20_000 })
  await orcaPage.getByRole('button', { name: 'Unstage all', exact: true }).click()
  await expect(untrackedRow).toBeVisible({ timeout: 20_000 })

  await orcaPage.evaluate(async () => {
    await window.__store?.getState()?.updateSettings?.({
      sourceControlSectionLayout: {
        hidden: ['staged'],
        order: ['unstaged', 'changes', 'staged']
      }
    })
  })
  await expect(header('Staged Changes')).toHaveCount(0)
  const unstagedBox = await header('Unstaged Changes').boundingBox()
  const changesBox = await header('Changes').boundingBox()
  expect(unstagedBox && changesBox && unstagedBox.y < changesBox.y).toBe(true)
  await saveShot(orcaPage, 'source-control-reordered.png')

  await orcaPage.reload()
  await orcaPage.evaluate(() => {
    const state = window.__store?.getState()
    state?.setRightSidebarOpen(true)
    state?.setRightSidebarTab('source-control')
  })
  await expect(header('Unstaged Changes')).toBeVisible({ timeout: 30_000 })
  await expect(header('Staged Changes')).toHaveCount(0)
  await expect(orcaPage.getByTitle('PR Diff Viewer')).toHaveCount(0)
})
