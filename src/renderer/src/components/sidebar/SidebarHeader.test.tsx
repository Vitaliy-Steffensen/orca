// @vitest-environment happy-dom

import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SidebarHeader from './SidebarHeader'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

const mocks = vi.hoisted(() => {
  const popoverContentProps: { current: Record<string, unknown> | null } = { current: null }
  const shortcutLabel: { current: string | null } = { current: '⌘N' }

  return {
    openWorkspaceCreationComposerWithTourHandoff: vi.fn(),
    popoverContentProps,
    shortcutLabel,
    toast: vi.fn()
  }
})

type MockState = {
  repos: { id: string }[]
  groupBy: string
  sidebarBody: 'workspaces' | 'agents'
  sidebarWidth: number
  setSidebarBody: (body: 'workspaces' | 'agents') => void
  openModal: (modal: string, data?: unknown) => void
  updateSettings: (patch: Record<string, unknown>) => void
  activeContextualTourId: string | null
  settings?: {
    experimentalAgentDashboardPopout?: boolean
    agentsSidebarIntroShown?: boolean
    agentsSidebarMigratedFromExperimental?: boolean
  }
}

let mockState: MockState

vi.mock('@/store', () => {
  const useAppStore = (selector: (state: MockState) => unknown) => selector(mockState)
  useAppStore.getState = () => mockState
  return { useAppStore }
})

vi.mock('@/components/dashboard/useAgentBucketCounts', () => ({
  useAgentBucketCounts: () => ({ attention: 0, working: 0, done: 0, idle: 0 })
}))

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DropdownMenuSub: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DropdownMenuSubContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DropdownMenuSubTrigger: ({ children }: { children: React.ReactNode }) => (
    <span data-testid="options-submenu-trigger">{children}</span>
  ),
  DropdownMenuItem: ({
    children,
    onSelect
  }: {
    children: React.ReactNode
    onSelect?: () => void
  }) => (
    <button type="button" data-testid="menu-item" onClick={() => onSelect?.()}>
      {children}
    </button>
  )
}))

vi.mock('./workspace-options-menu-items', () => ({
  useWorkspaceOptionsFilterBadge: () => ({
    hasAnyFilter: false,
    activeFilterCount: 0,
    activeFilterLabel: '0 filters'
  }),
  WorkspaceOptionsMenuItems: () => null
}))

vi.mock('@/hooks/useShortcutLabel', () => ({
  useShortcutLabel: () => '⌘N',
  formatOptionalPrimaryShortcutLabel: () => mocks.shortcutLabel.current
}))

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <>{children}</>
}))

vi.mock('../contextual-tours/workspace-creation-tour-handoff', () => ({
  openWorkspaceCreationComposerWithTourHandoff: mocks.openWorkspaceCreationComposerWithTourHandoff
}))

vi.mock('sonner', () => ({ toast: mocks.toast }))

// Deterministic popover: expose the open flag instead of relying on radix portals.
vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children, open }: { children: React.ReactNode; open?: boolean }) => (
    <div data-intro-open={open ? '' : undefined}>{children}</div>
  ),
  PopoverAnchor: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PopoverArrow: () => <div data-testid="popover-arrow" />,
  PopoverContent: ({ children, ...props }: { children: React.ReactNode }) => {
    mocks.popoverContentProps.current = props
    return <>{children}</>
  }
}))

let container: HTMLDivElement
let root: Root

function headerButton(label: string): HTMLButtonElement {
  const button = container.querySelector<HTMLButtonElement>(`[aria-label="${label}"]`)
  if (!button) {
    throw new Error(`Header button not rendered: ${label}`)
  }
  return button
}

function menuItem(label: string): HTMLButtonElement {
  const item = [...container.querySelectorAll<HTMLButtonElement>('[data-testid="menu-item"]')].find(
    (node) => node.textContent?.includes(label)
  )
  if (!item) {
    throw new Error(`Menu item not rendered: ${label}`)
  }
  return item
}

function createButton(): HTMLButtonElement {
  return headerButton('New workspace')
}

beforeEach(() => {
  mocks.openWorkspaceCreationComposerWithTourHandoff.mockClear()
  mocks.toast.mockClear()
  mocks.shortcutLabel.current = '⌘N'
  mockState = {
    repos: [],
    groupBy: 'repo',
    sidebarBody: 'workspaces',
    sidebarWidth: 280,
    setSidebarBody: vi.fn(),
    openModal: vi.fn(),
    updateSettings: vi.fn(),
    activeContextualTourId: null,
    settings: {}
  }
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

describe('SidebarHeader', () => {
  it('keeps New workspace clickable with zero projects, since the composer adds the first one', async () => {
    act(() => {
      root.render(<SidebarHeader onWorkspaceBoardMenuOpenChange={vi.fn()} />)
    })

    expect(createButton().disabled).toBe(false)

    await act(async () => {
      createButton().click()
    })

    expect(mocks.openWorkspaceCreationComposerWithTourHandoff).toHaveBeenCalledTimes(1)
  })

  it('opens the composer the same way once projects exist', async () => {
    mockState.repos = [{ id: 'repo-a' }]
    act(() => {
      root.render(<SidebarHeader onWorkspaceBoardMenuOpenChange={vi.fn()} />)
    })

    await act(async () => {
      createButton().click()
    })

    expect(createButton().disabled).toBe(false)
    expect(mocks.openWorkspaceCreationComposerWithTourHandoff).toHaveBeenCalledTimes(1)
  })

  it('reaches Add project from the More menu and New workspace in one click', async () => {
    act(() => {
      root.render(<SidebarHeader onWorkspaceBoardMenuOpenChange={vi.fn()} />)
    })

    expect(headerButton('New workspace')).toBeTruthy()
    expect(headerButton('More')).toBeTruthy()
    expect(container.querySelector('[aria-label="Add project"]')).toBeNull()

    await act(async () => {
      menuItem('Add project').click()
    })

    expect(mockState.openModal).toHaveBeenCalledWith('add-repo')
    expect(mocks.openWorkspaceCreationComposerWithTourHandoff).not.toHaveBeenCalled()
  })

  it('keeps the create button rightmost so the frequent action stays where it was', () => {
    act(() => {
      root.render(<SidebarHeader onWorkspaceBoardMenuOpenChange={vi.fn()} />)
    })

    const labels = [...container.querySelectorAll<HTMLElement>('[aria-label]')]
      .map((node) => node.getAttribute('aria-label'))
      .filter((label): label is string => label === 'More' || label === 'New workspace')
    expect(labels).toEqual(['More', 'New workspace'])
  })

  it('advertises the workspace shortcut on the create tooltip, and omits it when unassigned', () => {
    act(() => {
      root.render(<SidebarHeader onWorkspaceBoardMenuOpenChange={vi.fn()} />)
    })
    expect(container.textContent).toContain('⌘N')

    mocks.shortcutLabel.current = null
    act(() => {
      root.render(<SidebarHeader onWorkspaceBoardMenuOpenChange={vi.fn()} />)
    })
    expect(container.textContent).not.toContain('⌘N')
  })

  it('opens agent activity from the More menu', () => {
    act(() => {
      root.render(<SidebarHeader onWorkspaceBoardMenuOpenChange={vi.fn()} />)
    })

    act(() => {
      menuItem('View activity').click()
    })

    expect(mockState.setSidebarBody).toHaveBeenCalledWith('agents')
  })

  it('shows the Agents introduction only for migrated users and never offers a hide action', () => {
    mockState.settings = { agentsSidebarMigratedFromExperimental: true }
    act(() => {
      root.render(<SidebarHeader onWorkspaceBoardMenuOpenChange={vi.fn()} />)
    })

    expect(container.querySelector('[data-intro-open]')).toBeTruthy()
    expect(container.textContent).toContain('Agents are easier to find')
    expect(container.textContent).not.toContain('Hide Agents')

    mockState.settings = {}
    act(() => {
      root.render(<SidebarHeader onWorkspaceBoardMenuOpenChange={vi.fn()} />)
    })
    expect(container.querySelector('[data-intro-open]')).toBeNull()
  })

  it('turns off agent activity from the More menu when active', () => {
    mockState.sidebarBody = 'agents'
    act(() => {
      root.render(<SidebarHeader onWorkspaceBoardMenuOpenChange={vi.fn()} />)
    })

    act(() => {
      menuItem('Turn off activity view').click()
    })

    expect(mockState.setSidebarBody).toHaveBeenCalledWith('workspaces')
  })

  it('uses the legacy title based on workspace grouping', () => {
    act(() => {
      root.render(<SidebarHeader onWorkspaceBoardMenuOpenChange={vi.fn()} />)
    })

    expect(container.querySelector('[data-sidebar-section-title="projects"]')?.textContent).toBe(
      'Projects'
    )

    mockState.groupBy = 'workspace-status'
    act(() => {
      root.render(<SidebarHeader onWorkspaceBoardMenuOpenChange={vi.fn()} />)
    })
    expect(container.querySelector('[data-sidebar-section-title="workspaces"]')?.textContent).toBe(
      'Workspaces'
    )
  })

  it('drops only the workspace options submenu in the agents view', () => {
    act(() => {
      root.render(<SidebarHeader onWorkspaceBoardMenuOpenChange={vi.fn()} />)
    })
    expect(container.querySelector('[data-testid="options-submenu-trigger"]')).toBeTruthy()

    mockState.sidebarBody = 'agents'
    act(() => {
      root.render(<SidebarHeader onWorkspaceBoardMenuOpenChange={vi.fn()} />)
    })

    expect(container.querySelector('[data-testid="options-submenu-trigger"]')).toBeNull()
    expect(menuItem('Turn off activity view')).toBeTruthy()
    expect(menuItem('Add project')).toBeTruthy()
    expect(container.querySelector('[aria-label="New workspace"]')).toBeTruthy()
  })

  it('keeps the More menu and create button on one row', async () => {
    act(() => {
      root.render(<SidebarHeader onWorkspaceBoardMenuOpenChange={vi.fn()} />)
    })

    const headerRow = container.querySelector('.mt-2')
    const headerClasses = new Set(headerRow?.className.split(/\s+/) ?? [])
    expect(headerClasses.has('flex-wrap')).toBe(false)
    expect(headerClasses.has('h-8')).toBe(true)
    expect(container.querySelector('[aria-label="More"]')).toBeTruthy()
    expect(container.querySelector('[aria-label="New workspace"]')).toBeTruthy()

    await act(async () => {
      createButton().click()
    })
    expect(mocks.openWorkspaceCreationComposerWithTourHandoff).toHaveBeenCalledTimes(1)
  })

  it('does not reset a persisted agents body before settings hydrate', () => {
    mockState.settings = undefined
    mockState.sidebarBody = 'agents'
    act(() => {
      root.render(<SidebarHeader onWorkspaceBoardMenuOpenChange={vi.fn()} />)
    })

    expect(mockState.setSidebarBody).not.toHaveBeenCalled()
  })

  it('does not expose the deprecated full Agents view in agents mode', () => {
    mockState.settings = { agentsSidebarIntroShown: true }
    mockState.sidebarBody = 'agents'
    act(() => {
      root.render(<SidebarHeader onWorkspaceBoardMenuOpenChange={vi.fn()} />)
    })

    expect(container.querySelector('[aria-label="Open full Agents view"]')).toBeNull()
  })
})
