import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import type { Page } from '@stablyai/playwright-test'
import { test, expect } from './helpers/orca-app'
import { waitForSessionReady } from './helpers/store'

const DIRECTORIES = ['alpha', 'bravo', 'charlie']
const FILES_PER_DIRECTORY = 4
const LINES_PER_FILE = 120

function runGit(repoPath: string, args: string[]): void {
  execFileSync('git', args, { cwd: repoPath, stdio: 'pipe' })
}

function buildFile(seed: string, extraLines: number): string {
  return `${Array.from(
    { length: LINES_PER_FILE + extraLines },
    (_, line) => `export const ${seed}_${line} = ${line}`
  ).join('\n')}\n`
}

function createNestedDiffRepo(): string {
  const repoPath = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'orca-reveal-combined-')))
  runGit(repoPath, ['init'])
  runGit(repoPath, ['config', 'user.email', 'e2e@test.local'])
  runGit(repoPath, ['config', 'user.name', 'E2E Test'])

  for (const directory of DIRECTORIES) {
    mkdirSync(path.join(repoPath, 'src', directory), { recursive: true })
    for (let index = 0; index < FILES_PER_DIRECTORY; index += 1) {
      writeFileSync(
        path.join(repoPath, 'src', directory, `file-${index}.ts`),
        buildFile(`${directory}_${index}`, 0)
      )
    }
  }
  runGit(repoPath, ['add', '-A'])
  runGit(repoPath, ['commit', '-m', 'Initial nested diff fixture'])

  for (const directory of DIRECTORIES) {
    for (let index = 0; index < FILES_PER_DIRECTORY; index += 1) {
      writeFileSync(
        path.join(repoPath, 'src', directory, `file-${index}.ts`),
        buildFile(`${directory}_${index}`, 40)
      )
    }
  }

  return repoPath
}

async function activateRepo(page: Page, repoPath: string): Promise<string> {
  const repoId = await page.evaluate(async (target: string) => {
    const added = await window.__store?.getState().addRepoPath(target)
    if (!added) {
      throw new Error(`repo not added: ${target}`)
    }
    return added.id
  }, repoPath)

  await expect
    .poll(
      () =>
        page.evaluate(async (target: string) => {
          await window.__store?.getState().fetchWorktrees(target)
          return window.__store?.getState().worktreesByRepo[target]?.length ?? 0
        }, repoId),
      { timeout: 30_000, message: 'worktree did not load' }
    )
    .toBeGreaterThan(0)

  return page.evaluate(
    ({ targetRepoId, target }) => {
      const state = window.__store?.getState()
      const worktree = (state?.worktreesByRepo[targetRepoId] ?? []).find(
        (entry) => entry.path === target
      )
      if (!state || !worktree) {
        throw new Error(`worktree not found: ${target}`)
      }
      state.setActiveRepo(targetRepoId)
      state.setActiveWorktree(worktree.id)
      return worktree.id
    },
    { targetRepoId: repoId, target: repoPath }
  )
}

test('reveals the diff section on screen in the combined diff file tree', async ({
  orcaPage,
  registerPostElectronShutdownCleanup
}) => {
  const repoPath = createNestedDiffRepo()
  registerPostElectronShutdownCleanup(async () =>
    rmSync(repoPath, { recursive: true, force: true })
  )

  await waitForSessionReady(orcaPage)
  const worktreeId = await activateRepo(orcaPage, repoPath)
  await orcaPage.evaluate(
    async ({ wId, target }) => {
      const state = window.__store?.getState()
      const status = await window.api.git.status({ worktreePath: target })
      const entries = status.entries.filter((entry) => entry.area === 'unstaged')
      state?.setGitStatus(wId, status)
      state?.openAllDiffs(wId, target, undefined, 'unstaged', entries)
    },
    { wId: worktreeId, target: repoPath }
  )

  const tree = orcaPage.locator('[data-combined-diff-section-key]').first()
  await expect(tree).toBeVisible({ timeout: 30_000 })

  // Scroll deep so the section on screen is not the one the tree would highlight by default.
  await orcaPage.evaluate(() => {
    const container = document.querySelector<HTMLElement>('.combined-diff-scroll-container')
    if (!container) {
      throw new Error('combined diff scroll container not found')
    }
    const target = Math.max(0, container.scrollHeight - container.clientHeight - 1)
    container.scrollTop = target
    container.dispatchEvent(new Event('scroll', { bubbles: true }))
  })

  const readAnchoredSectionKey = (): Promise<string> =>
    orcaPage.evaluate(() => {
      const container = document.querySelector<HTMLElement>('.combined-diff-scroll-container')
      const top = container?.getBoundingClientRect().top ?? 0
      const sections = Array.from(
        document.querySelectorAll<HTMLElement>('[data-combined-diff-section-key]')
      )
      const onScreen = sections.find((section) => section.getBoundingClientRect().bottom > top)
      return onScreen?.dataset.combinedDiffSectionKey ?? ''
    })

  await expect
    .poll(readAnchoredSectionKey, { timeout: 15_000, message: 'no diff section settled on screen' })
    .not.toBe('')
  const anchoredSectionKey = await readAnchoredSectionKey()
  // Guards the failure mode where the tree highlights its first row rather than following scroll.
  expect(anchoredSectionKey).not.toContain(`src/${DIRECTORIES[0]}/file-0.ts`)

  // The tree ships hidden, so the reveal has to bring it back before it can scroll.
  await expect(orcaPage.getByRole('button', { name: 'Collapse file tree' })).toHaveCount(0)

  await orcaPage.keyboard.press('ControlOrMeta+Shift+H')

  await expect(orcaPage.getByRole('button', { name: 'Collapse file tree' })).toBeVisible({
    timeout: 10_000
  })
  const flashed = orcaPage.locator('[class*="bg-amber-400/20"]')
  await expect(flashed).toHaveCount(1, { timeout: 10_000 })
  await expect(flashed).toContainText(path.posix.basename(anchoredSectionKey))
})
