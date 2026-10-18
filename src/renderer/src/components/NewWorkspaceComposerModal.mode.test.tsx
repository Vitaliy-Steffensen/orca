// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import type { NewWorkspaceComposerCardProps } from './new-workspace/new-workspace-composer-card-props'
import NewWorkspaceComposerModal from './NewWorkspaceComposerModal'

const mocks = vi.hoisted(() => ({
  submitQuick: vi.fn(async () => {}),
  state: {
    activeModal: 'new-workspace-composer',
    modalData: {},
    settings: { defaultTuiAgent: 'codex', disabledTuiAgents: [] },
    closeModal: vi.fn()
  }
}))
vi.mock('@/store', () => ({
  useAppStore: (selector: (state: typeof mocks.state) => unknown) => selector(mocks.state)
}))
vi.mock('@/hooks/useComposerState', () => ({
  useComposerState: () => ({
    cardProps: {
      detectedAgentIds: new Set(['claude', 'cursor', 'codex', 'grok']),
      projectOptions: [],
      selectedProjectId: null
    },
    composerRef: { current: null },
    nameInputRef: { current: null },
    submitQuick: mocks.submitQuick,
    createDisabled: false
  })
}))
vi.mock('@/components/ui/dialog', () => {
  const Container = ({ children }: { children: ReactNode }) => <div>{children}</div>
  return {
    Dialog: Container,
    DialogContent: Container,
    DialogHeader: Container,
    DialogTitle: Container,
    DialogDescription: Container
  }
})
vi.mock('@/components/agent/AgentSettingsDialog', () => ({ default: () => null }))
vi.mock('@/components/NewWorkspaceComposerCard', () => ({
  default: (props: NewWorkspaceComposerCardProps) => (
    <div>
      <output aria-label="Selected mode">{props.workspaceMode}</output>
      <output aria-label="Selected agent">{props.quickAgent}</output>
      <button onClick={() => props.onWorkspaceModeChange?.('ask')}>Ask</button>
      <button onClick={() => props.onWorkspaceModeChange?.('autonomous')}>Autonomous</button>
      <button onClick={() => props.onQuickAgentChange('codex')}>Choose Codex</button>
      <button onClick={props.onCreate}>Create</button>
    </div>
  )
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  mocks.state.activeModal = 'new-workspace-composer'
})

describe('workspace composer modes', () => {
  it('opens supervised, changes preferred agents, and preserves a manual pick', () => {
    render(<NewWorkspaceComposerModal />)
    expect(screen.getByLabelText('Selected mode').textContent).toBe('supervised')
    expect(screen.getByLabelText('Selected agent').textContent).toBe('claude')
    fireEvent.click(screen.getByText('Ask'))
    expect(screen.getByLabelText('Selected agent').textContent).toBe('cursor')
    fireEvent.click(screen.getByText('Choose Codex'))
    fireEvent.click(screen.getByText('Autonomous'))
    expect(screen.getByLabelText('Selected agent').textContent).toBe('codex')
    fireEvent.click(screen.getByText('Create'))
    expect(mocks.submitQuick).toHaveBeenCalledWith('codex', undefined, 'autonomous')
  })
  it('resets the mode on reopen and handles the platform shortcut', () => {
    const { rerender } = render(<NewWorkspaceComposerModal />)
    fireEvent.keyDown(window, {
      key: '3',
      [navigator.userAgent.includes('Mac') ? 'metaKey' : 'ctrlKey']: true
    })
    expect(screen.getByLabelText('Selected mode').textContent).toBe('autonomous')
    expect(screen.getByLabelText('Selected agent').textContent).toBe('grok')
    mocks.state.activeModal = 'none'
    rerender(<NewWorkspaceComposerModal />)
    mocks.state.activeModal = 'new-workspace-composer'
    rerender(<NewWorkspaceComposerModal />)
    expect(screen.getByLabelText('Selected mode').textContent).toBe('supervised')
  })
})
