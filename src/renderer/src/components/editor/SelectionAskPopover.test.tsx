// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAppStore } from '@/store'
import type { AgentLaunchRoute } from '@/lib/agent-launch-routing'
import type { LaunchAgentInNewTabArgs } from '@/lib/launch-agent-in-new-tab'
import SelectionAskPopover from './SelectionAskPopover'
import type { SelectionAskRequest } from './selection-ask-request'

const launchAgentInNewTab = vi.hoisted(() => vi.fn((_args: LaunchAgentInNewTabArgs) => null))
const route = vi.hoisted<{ current: AgentLaunchRoute }>(() => ({
  current: 'structured-native-chat'
}))
const cursorModels = vi.hoisted<{ current: { id: string; label: string }[] }>(() => ({
  current: []
}))

vi.mock('@/lib/launch-agent-in-new-tab', () => ({ launchAgentInNewTab }))
vi.mock('@/lib/agent-session-launch-plan', () => ({
  resolveAgentSessionLaunchRoute: () => route.current
}))
vi.mock('@/runtime/structured-agent-session-owner', () => ({
  resolveStructuredAgentSessionOwner: () => 'local',
  structuredAgentSessionTargetForHost: () => ({ kind: 'local' })
}))
vi.mock('@/runtime/host-model-catalog-snapshots', () => ({
  readHostModelCatalogSnapshot: (_target: unknown, agent: string) =>
    agent === 'cursor' && cursorModels.current.length > 0
      ? { origin: 'listed', models: cursorModels.current }
      : undefined,
  preloadHostModelCatalogSnapshots: async () => {
    cursorModels.current = [{ id: 'composer-1', label: 'Composer' }]
  }
}))
vi.mock('@/hooks/useAgentDetectionTarget', () => ({
  useAgentDetectionTargetForWorktree: () => null
}))
vi.mock('@/hooks/useDetectedAgents', () => ({
  useDetectedAgents: () => ({ detectedIds: ['cursor'] })
}))

const REQUEST: SelectionAskRequest = {
  worktreeId: 'repo::/tmp/wt',
  relativePath: 'src/renderer/src/components/editor/DiffViewer.tsx',
  language: 'typescript',
  startLine: 140,
  endLine: 158,
  selectedText: 'const askTarget = null',
  anchorRect: { top: 100, left: 40, width: 80, height: 24 }
}

const initialState = useAppStore.getInitialState()

beforeEach(() => {
  route.current = 'structured-native-chat'
  cursorModels.current = []
  launchAgentInNewTab.mockClear()
  act(() => {
    useAppStore.setState(initialState, true)
    useAppStore.setState({ selectionAskRequest: REQUEST })
  })
})

afterEach(cleanup)

describe('SelectionAskPopover', () => {
  it('preselects Composer once the host answers with Cursor’s catalog', async () => {
    render(<SelectionAskPopover />)

    await waitFor(() => expect(screen.getByText('Composer')).toBeInTheDocument())
  })

  it('sends the question on a model the picker actually listed', async () => {
    render(<SelectionAskPopover />)
    await waitFor(() => expect(screen.getByText('Composer')).toBeInTheDocument())

    fireEvent.change(screen.getByRole('textbox', { hidden: true }), {
      target: { value: 'What is this?' }
    })
    // Why not by name: the popper wrapper stays `visibility: hidden` without a layout, which
    // empties the computed accessible name of every control inside it.
    const send = screen.getAllByRole('button', { hidden: true }).at(-1)
    if (!send) {
      throw new Error('the Ask popover rendered no send button')
    }
    fireEvent.click(send)

    expect(launchAgentInNewTab).toHaveBeenCalledTimes(1)
    const args = launchAgentInNewTab.mock.calls[0]?.[0]
    expect(args?.agent).toBe('cursor')
    expect(args?.worktreeId).toBe(REQUEST.worktreeId)
    expect(args?.promptDelivery).toBe('auto-submit')
    expect(args?.launchSource).toBe('editor_selection_ask')
    expect(args?.seedOverlay?.model).toContain('composer-1')
    expect(args?.prompt).toContain('What is this?')
    expect(args?.prompt).toContain('Lines: 140-158')
    expect(useAppStore.getState().selectionAskRequest).toBeNull()
  })

  it('offers no model choice when the launch would open a terminal', async () => {
    route.current = 'terminal-tui'
    render(<SelectionAskPopover />)

    await waitFor(() => expect(screen.getByRole('textbox', { hidden: true })).toBeInTheDocument())
    expect(screen.queryByText('Composer')).not.toBeInTheDocument()
  })

  it('closes on Escape without launching anything', async () => {
    render(<SelectionAskPopover />)
    await waitFor(() => expect(screen.getByRole('textbox', { hidden: true })).toBeInTheDocument())

    fireEvent.keyDown(screen.getByRole('textbox', { hidden: true }), { key: 'Escape' })

    await waitFor(() => expect(useAppStore.getState().selectionAskRequest).toBeNull())
    expect(launchAgentInNewTab).not.toHaveBeenCalled()
  })
})
