import { test, expect } from './helpers/orca-app'
import {
  activateGoldenWorktree,
  cleanupGoldenWorktree,
  createGoldenWorktree
} from './helpers/golden-source-control'
import { waitForSessionReady } from './helpers/store'

test('asks about a code selection from the floating editor toolbar', async ({
  orcaPage,
  testRepoPath,
  registerPostElectronShutdownCleanup
}) => {
  const fixture = createGoldenWorktree(testRepoPath, 'selection-ask')
  registerPostElectronShutdownCleanup(async () => cleanupGoldenWorktree(testRepoPath, fixture))

  await waitForSessionReady(orcaPage)
  await activateGoldenWorktree(orcaPage, testRepoPath, fixture.worktreePath)
  await orcaPage.evaluate(() => {
    const state = window.__store?.getState()
    state?.setRightSidebarTab('explorer')
    state?.setRightSidebarOpen(true)
  })

  const explorer = orcaPage.locator('[data-orca-explorer-shell]')
  await explorer
    .locator('[data-file-explorer-row]')
    .filter({
      has: orcaPage.locator('[data-file-explorer-row-name]').getByText('package.json', {
        exact: true
      })
    })
    .dblclick()

  const monaco = orcaPage.locator('.monaco-editor').first()
  await expect(monaco).toBeVisible({ timeout: 25_000 })
  await monaco.click()
  // Find selects its match, which is the one selection Monaco makes reliably in a headless window.
  await orcaPage.keyboard.press('ControlOrMeta+f')
  const findInput = monaco.locator('.find-widget .input[aria-label="Find"]')
  await expect(findInput).toBeVisible()
  await findInput.fill('"name"')
  await orcaPage.keyboard.press('Enter')
  await orcaPage.keyboard.press('Escape')

  await expect
    .poll(() => orcaPage.evaluate(() => window.__monacoEditorE2E?.snapshot().selection ?? null), {
      message: 'Monaco did not select the searched text'
    })
    .not.toBeNull()

  const toolbar = orcaPage.locator('[data-orca-selection-toolbar]')
  await expect(toolbar).toBeVisible()
  await toolbar.locator('[data-orca-selection-ask]').click()

  await expect(orcaPage.getByPlaceholder('Ask about these lines…')).toBeVisible()
  expect(
    await orcaPage.evaluate(() => {
      const request = window.__store?.getState().selectionAskRequest
      return request && { relativePath: request.relativePath, selectedText: request.selectedText }
    })
  ).toEqual({ relativePath: 'package.json', selectedText: '"name"' })
})
