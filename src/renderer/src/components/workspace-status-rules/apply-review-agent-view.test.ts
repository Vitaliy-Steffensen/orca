import { describe, expect, it, vi } from 'vitest'
import { applyReviewAgentView, type ReviewAgentViewDeps } from './apply-review-agent-view'

type AgentState = Parameters<ReviewAgentViewDeps['subscribe']>[0] extends (s: infer S) => void
  ? S
  : never

function harness(initial: AgentState) {
  let state = initial
  const listeners = new Set<(s: AgentState) => void>()
  const deps: ReviewAgentViewDeps = {
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    setTabViewMode: vi.fn(),
    preferClaudeWeb: vi.fn(),
    hideClaudeWeb: vi.fn()
  }
  const update = (next: AgentState): void => {
    state = next
    for (const listener of listeners) {
      listener(state)
    }
  }
  return { deps, update, listeners }
}

const EMPTY = { agentStatusByPaneKey: {}, paneForegroundAgentByPaneKey: {} }
const launched = { tabId: 'tab-1', paneKey: 'tab-1:leaf-1' }

describe('applyReviewAgentView', () => {
  it('waits for the agent to be recognized before showing the Chat UI', () => {
    const { deps, update, listeners } = harness(EMPTY)
    applyReviewAgentView(launched, 'chat', deps)

    expect(deps.preferClaudeWeb).toHaveBeenCalledWith('tab-1', false)
    expect(deps.setTabViewMode).not.toHaveBeenCalled()

    update({ ...EMPTY, paneForegroundAgentByPaneKey: { 'tab-1:leaf-1': 'claude' } })
    update({ ...EMPTY, paneForegroundAgentByPaneKey: { 'tab-1:leaf-1': 'claude' } })
    expect(deps.setTabViewMode).toHaveBeenCalledTimes(1)
    expect(deps.setTabViewMode).toHaveBeenCalledWith('tab-1', 'chat')
    expect(listeners.size).toBe(0)
  })

  it('shows the Chat UI at once when the agent is already recognized', () => {
    const { deps } = harness({
      ...EMPTY,
      agentStatusByPaneKey: { 'tab-1:leaf-1': { agentType: 'claude' } }
    })
    applyReviewAgentView(launched, 'chat', deps)
    expect(deps.setTabViewMode).toHaveBeenCalledWith('tab-1', 'chat')
  })

  it('keeps the terminal and the Claude web choices as they were', () => {
    const terminal = harness(EMPTY)
    applyReviewAgentView(launched, 'terminal', terminal.deps)
    expect(terminal.deps.setTabViewMode).toHaveBeenCalledWith('tab-1', 'terminal')
    expect(terminal.deps.preferClaudeWeb).toHaveBeenCalledWith('tab-1', false)

    const web = harness(EMPTY)
    applyReviewAgentView(launched, 'claude-web', web.deps)
    expect(web.deps.preferClaudeWeb).toHaveBeenCalledWith('tab-1', true)
    expect(web.deps.setTabViewMode).not.toHaveBeenCalled()
  })
})
