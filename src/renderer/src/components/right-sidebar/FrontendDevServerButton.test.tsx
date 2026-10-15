// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'

const mocks = vi.hoisted(() => ({
  labels: [] as { label: string; url: string; port: number }[],
  ports: [] as { port: number }[],
  openLinksInApp: false,
  createBrowserTab: vi.fn(),
  openUrl: vi.fn()
}))

vi.mock('@/store', () => {
  const state = () => ({
    activeWorktreeId: 'wt-1',
    settings: { openLinksInApp: mocks.openLinksInApp },
    workspacePortScan: null,
    createBrowserTab: mocks.createBrowserTab
  })
  return { useAppStore: (select: (s: ReturnType<typeof state>) => unknown) => select(state()) }
})
vi.mock('@/lib/workspace-port-groups', () => ({
  getWorkspacePortsByWorktreeId: () => new Map([['wt-1', mocks.ports]])
}))
vi.mock('../sidebar/worktree-card-port-labels', () => ({
  useWorkspacePortLabels: () => mocks.labels
}))
vi.stubGlobal('api', { shell: { openUrl: mocks.openUrl } })

import { FrontendDevServerButton } from './FrontendDevServerButton'

const FRONTEND = { label: 'Frontend', url: 'http://e-4871.localhost:26076', port: 26076 }

function renderButton() {
  return render(
    <TooltipProvider>
      <FrontendDevServerButton />
    </TooltipProvider>
  )
}

afterEach(() => {
  cleanup()
  mocks.createBrowserTab.mockReset()
  mocks.openUrl.mockReset()
})

describe('FrontendDevServerButton', () => {
  it("opens the active workspace's frontend while it is running", () => {
    mocks.labels = [FRONTEND]
    mocks.ports = [{ port: 26076 }]
    renderButton()

    fireEvent.click(screen.getByRole('button', { name: 'Open Frontend' }))
    expect(mocks.openUrl).toHaveBeenCalledWith(FRONTEND.url)
  })

  it("opens it in Orca's browser when links open in the app", () => {
    mocks.labels = [FRONTEND]
    mocks.ports = [{ port: 26076 }]
    mocks.openLinksInApp = true
    renderButton()

    fireEvent.click(screen.getByRole('button', { name: 'Open Frontend' }))
    expect(mocks.createBrowserTab).toHaveBeenCalledWith('wt-1', FRONTEND.url)
    mocks.openLinksInApp = false
  })

  it('is hidden while the frontend is not running', () => {
    mocks.labels = [FRONTEND]
    mocks.ports = [{ port: 4206 }]
    renderButton()

    expect(screen.queryByRole('button', { name: 'Open Frontend' })).toBeNull()
  })
})
