import path from 'node:path'
import { test, expect } from './helpers/orca-app'
import { waitForActiveWorktree, waitForSessionReady } from './helpers/store'
import { openSidebarWorkspaceComposer } from './helpers/sidebar-project-dialog'

test('composer modes persist clearance and question intent at creation', async ({
  orcaPage,
  electronApp
}) => {
  await waitForSessionReady(orcaPage)
  await waitForActiveWorktree(orcaPage)
  const errors: string[] = []
  orcaPage.on('pageerror', (error) => errors.push(error.message))
  const isMac = await orcaPage.evaluate(() => navigator.userAgent.includes('Mac'))
  for (const mode of ['supervised', 'autonomous', 'ask'] as const) {
    await openSidebarWorkspaceComposer(orcaPage)
    const dialog = orcaPage.getByRole('dialog', { name: /Create (Workspace|Worktree)/i })
    const modes = dialog.getByRole('radiogroup', { name: 'Workspace mode' })
    await expect(modes.getByRole('radio', { name: /^Supervised/ })).toHaveAttribute(
      'aria-checked',
      'true'
    )
    if (mode !== 'supervised') {
      await modes.getByRole('radio', { name: mode === 'ask' ? /^Ask/ : /^Autonomous/ }).click()
    }
    if (mode === 'supervised') {
      await orcaPage.keyboard.press(`${isMac ? 'Meta' : 'Control'}+2`)
      await dialog.screenshot({ path: path.resolve('.context/workspace-modes.png') })
    }
    await expect(modes.getByRole('radio', { name: new RegExp(`^${mode}`, 'i') })).toHaveAttribute(
      'aria-checked',
      'true'
    )
    await dialog.getByRole('button', { name: 'Advanced', exact: true }).click()
    const agent = dialog.locator('[data-agent-combobox-root="true"][role="combobox"]')
    await agent.click()
    await orcaPage.getByRole('option', { name: /Blank Terminal/i }).click()
    const name = `mode-${mode}-${Date.now()}`
    await dialog.locator('[data-workspace-name-input="true"]').fill(name)
    await dialog.getByRole('button', { name: /Create (Workspace|Worktree)/i }).click()
    await expect(dialog).toBeHidden({ timeout: 20_000 })
    await expect
      .poll(
        () =>
          orcaPage.evaluate((workspaceName) => {
            const state = window.__store!.getState()
            const workspace = Object.values(state.worktreesByRepo)
              .flat()
              .find((row) => row.displayName === workspaceName)
            return workspace
              ? { autonomy: workspace.workspaceAutonomy, intent: workspace.workspaceIntent }
              : null
          }, name),
        { timeout: 20_000 }
      )
      .toEqual({
        autonomy: mode === 'autonomous' ? 'autonomous' : 'supervised',
        intent: mode === 'ask' ? 'question' : 'task'
      })
  }
  await expect(orcaPage.getByLabel('Autonomous workspace', { exact: true }).first()).toBeVisible()
  await expect(orcaPage.getByLabel('Question workspace', { exact: true }).first()).toBeVisible()
  await orcaPage.screenshot({ path: path.resolve('.context/workspace-mode-badges.png') })
  expect(
    await electronApp.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows().some((window) => window.isVisible())
    )
  ).toBe(false)
  expect(errors).toEqual([])
})
