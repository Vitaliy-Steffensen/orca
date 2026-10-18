import { test, expect } from './helpers/orca-app'
import {
  getAllWorktreeIds,
  switchToWorktree,
  waitForActiveWorktree,
  waitForSessionReady
} from './helpers/store'
import {
  giveWorkspaceALivePty,
  readHostLiveTerminalCount,
  readWorkspaceSample,
  rowLocator
} from './helpers/slept-workspace-probe'

async function openWorktreeContextMenu(
  page: Parameters<typeof rowLocator>[0],
  worktreeId: string
): Promise<void> {
  const row = rowLocator(page, worktreeId)
  await expect(row).toBeVisible()
  await row.scrollIntoViewIfNeeded()
  const scope = row.locator('[data-worktree-context-menu-scope="worktree"]').first()
  const target = (await scope.count()) > 0 ? scope : row
  await target.click({ button: 'right' })
}

test('archiving a workspace shuts it down and hides it, and unarchiving brings it back', async ({
  orcaPage
}, testInfo) => {
  await waitForSessionReady(orcaPage)
  const source = await waitForActiveWorktree(orcaPage)
  const target = (await getAllWorktreeIds(orcaPage)).find((id) => id !== source)
  if (!target) {
    throw new Error('Expected a second seeded workspace')
  }
  await giveWorkspaceALivePty(orcaPage, target)
  expect((await readWorkspaceSample(orcaPage, target)).livePtyCount).toBeGreaterThan(0)
  expect(await readHostLiveTerminalCount(orcaPage, target)).toBeGreaterThan(0)
  await switchToWorktree(orcaPage, source)

  await openWorktreeContextMenu(orcaPage, target)
  const archiveItem = orcaPage.getByRole('menuitem', { name: 'Archive', exact: true }).first()
  await expect(archiveItem).toBeVisible()
  await archiveItem.click()

  // Gone from the sidebar, and the host agrees its terminals are gone with it.
  await expect(rowLocator(orcaPage, target)).toBeHidden()
  await expect
    .poll(() => readHostLiveTerminalCount(orcaPage, target), {
      timeout: 30_000,
      message: 'archive left live terminals on the host'
    })
    .toBe(0)
  expect((await readWorkspaceSample(orcaPage, target)).livePtyCount).toBe(0)
  // The tab records survive, which is what makes unarchive a restore and not a reset.
  expect((await readWorkspaceSample(orcaPage, target)).tabCount).toBeGreaterThan(0)
  expect(
    await orcaPage.evaluate(
      (id) => window.__store!.getState().getKnownWorktreeById(id)?.isArchived ?? null,
      target
    )
  ).toBe(true)
  await orcaPage.screenshot({ path: testInfo.outputPath('archived-hidden.png') })

  // Cmd+J's quick action is the way back to it.
  await orcaPage.evaluate(() => window.__store!.getState().openModal('worktree-palette'))
  const dialog = orcaPage.getByRole('dialog', { name: 'Jump to...' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('combobox').fill('archived')
  const quickAction = dialog.locator('[cmdk-item]', { hasText: 'View Archived Workspaces' }).first()
  await expect(quickAction).toBeVisible()
  await quickAction.click()
  await expect(dialog).toBeHidden()

  const revealedRow = rowLocator(orcaPage, target)
  await expect(revealedRow).toBeVisible()
  await expect(revealedRow.getByText('Archived')).toBeAttached()
  await orcaPage.screenshot({ path: testInfo.outputPath('archived-revealed.png') })

  await openWorktreeContextMenu(orcaPage, target)
  const unarchiveItem = orcaPage.getByRole('menuitem', { name: 'Unarchive', exact: true }).first()
  await expect(unarchiveItem).toBeVisible()
  await unarchiveItem.click()

  await expect
    .poll(
      () =>
        orcaPage.evaluate(
          (id) => window.__store!.getState().getKnownWorktreeById(id)?.isArchived ?? null,
          target
        ),
      { timeout: 10_000, message: 'unarchive did not clear the flag' }
    )
    .toBe(false)
  // Still listed with "Show archived" off again, which is the real proof it is back.
  await orcaPage.evaluate(() => window.__store!.getState().setShowArchivedWorkspaces(false))
  await expect(rowLocator(orcaPage, target)).toBeVisible()
  await orcaPage.screenshot({ path: testInfo.outputPath('unarchived.png') })
})
