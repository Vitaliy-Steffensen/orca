import { useAppStore } from '@/store'
import { preferClaudeWebForTab } from '@/components/terminal-pane/claude-web-tab-preference'
import { claudeWebView } from '@/components/terminal-pane/claude-web-view-state'
import type { ReviewAgentView } from '../../../../shared/workspace-status-rule-config'

type AgentRecognitionState = {
  agentStatusByPaneKey: Readonly<Record<string, { agentType?: string } | undefined>>
  paneForegroundAgentByPaneKey: Readonly<Record<string, unknown>>
}

export type ReviewAgentViewDeps = {
  getState: () => AgentRecognitionState
  subscribe: (listener: (state: AgentRecognitionState) => void) => () => void
  setTabViewMode: (tabId: string, mode: 'terminal' | 'chat') => void
  preferClaudeWeb: (tabId: string, openInWebView: boolean) => void
  hideClaudeWeb: (tabId: string) => void
}

const defaultDeps: ReviewAgentViewDeps = {
  getState: () => useAppStore.getState(),
  subscribe: (listener) => useAppStore.subscribe(listener),
  setTabViewMode: (tabId, mode) => useAppStore.getState().setTabViewMode(tabId, mode),
  preferClaudeWeb: preferClaudeWebForTab,
  hideClaudeWeb: (tabId) => claudeWebView.hide(tabId)
}

function isAgentRecognized(state: AgentRecognitionState, paneKey: string): boolean {
  return Boolean(
    state.agentStatusByPaneKey[paneKey]?.agentType || state.paneForegroundAgentByPaneKey[paneKey]
  )
}

/**
 * Fork: the user picks how a review opens; anything but 'default' overrides the app's default view.
 * Why Chat UI waits: a background launch's tab carries no launch agent, so until the agent is
 * recognized the pane counts as a plain shell, and the terminal pane turns chat back off.
 */
export function applyReviewAgentView(
  launched: { tabId: string; paneKey: string },
  view: ReviewAgentView,
  deps: ReviewAgentViewDeps = defaultDeps
): void {
  const { tabId, paneKey } = launched
  if (view === 'default') {
    return
  }
  if (view === 'claude-web') {
    deps.preferClaudeWeb(tabId, true)
    return
  }
  deps.preferClaudeWeb(tabId, false)
  // Why hide: the Claude web default can open the tab before the launch hands its id back.
  deps.hideClaudeWeb(tabId)
  if (view === 'terminal' || isAgentRecognized(deps.getState(), paneKey)) {
    deps.setTabViewMode(tabId, view)
    return
  }
  const unsubscribe = deps.subscribe((state) => {
    if (isAgentRecognized(state, paneKey)) {
      unsubscribe()
      deps.setTabViewMode(tabId, 'chat')
    }
  })
}
