// @vitest-environment happy-dom

import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { i18n } from '@/i18n/i18n'
import ko from '@/i18n/locales/ko.json'
import SidebarToolbar from './SidebarToolbar'

const mocks = vi.hoisted(() => ({ revealActiveWorkspace: vi.fn() }))

vi.mock('@/lib/scroll-to-current-workspace-status', () => ({
  requestScrollToCurrentWorkspaceReveal: mocks.revealActiveWorkspace
}))

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenuItem: ({ children, onSelect }: { children: ReactNode; onSelect?: () => void }) => (
    <button type="button" onClick={() => onSelect?.()}>
      {children}
    </button>
  ),
  DropdownMenuSeparator: () => <hr />
}))

vi.mock('./SidebarSettingsHelpMenu', () => ({
  SidebarSettingsHelpMenu: ({ overflowItems }: { overflowItems: ReactNode }) => (
    <div>
      <button type="button">Settings</button>
      {overflowItems}
    </div>
  )
}))

const roots: Root[] = []

async function renderToolbar(
  props: { workspaceBoardOpen?: boolean; onWorkspaceBoardToggle?: () => void } = {}
): Promise<HTMLDivElement> {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  roots.push(root)
  await act(async () => {
    root.render(
      <SidebarToolbar
        workspaceBoardOpen={props.workspaceBoardOpen ?? false}
        onWorkspaceBoardToggle={props.onWorkspaceBoardToggle ?? vi.fn()}
      />
    )
  })
  return container
}

function findButton(container: HTMLElement, label: string): HTMLButtonElement {
  const button = Array.from(container.querySelectorAll('button')).find((element) =>
    element.textContent?.includes(label)
  )
  expect(button).toBeDefined()
  return button as HTMLButtonElement
}

describe('SidebarToolbar', () => {
  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
  })

  afterEach(async () => {
    roots.splice(0).forEach((root) => {
      act(() => root.unmount())
    })
    document.body.replaceChildren()
    vi.clearAllMocks()
    // Why: the language-change case mutates the shared i18n instance; restore
    // here so a failing assertion cannot leave later tests running in Korean.
    await i18n.changeLanguage('en')
  })

  it('toggles the workspace board from the overflow menu', async () => {
    const onWorkspaceBoardToggle = vi.fn()
    const container = await renderToolbar({ onWorkspaceBoardToggle })

    await act(async () => {
      findButton(container, 'Workspace board').click()
    })

    expect(onWorkspaceBoardToggle).toHaveBeenCalledOnce()
  })

  it('reveals the active workspace from the overflow menu', async () => {
    const container = await renderToolbar()

    await act(async () => {
      findButton(container, 'Reveal active workspace').click()
    })

    expect(mocks.revealActiveWorkspace).toHaveBeenCalledOnce()
  })

  // Why: the toolbar is a React.memo boundary whose props never change on a
  // language switch, so without its own useTranslation() subscription it keeps
  // the English copy it rendered at boot (the persisted locale is applied
  // asynchronously, after the lazy catalog loads).
  it('relabels itself when the UI language changes after mount', async () => {
    const container = await renderToolbar()
    expect(container.textContent).toContain('Workspace board')

    await act(async () => {
      await i18n.changeLanguage('ko')
    })

    const localized = ko.auto.components.sidebar.SidebarToolbar['49f62c5665']
    expect(localized).not.toBe('Workspace board')
    expect(container.textContent).toContain(localized)
  })

  it('keeps account controls out of the sidebar footer', async () => {
    const container = await renderToolbar()

    expect(container.textContent).not.toContain('Profile')
    expect(container.textContent).toContain('Settings')
  })
})
