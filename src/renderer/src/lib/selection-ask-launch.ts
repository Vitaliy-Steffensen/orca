import { useAppStore } from '@/store'
import { launchAgentInNewTab } from '@/lib/launch-agent-in-new-tab'
import { newAgentLaunchRequestId } from '@/lib/agent-launch-request-id'
import {
  buildSelectionAskPrompt,
  resolveSimplifyPromptMark,
  selectionAskTabLabel
} from '@/components/editor/selection-ask-prompt'
import type { SelectionAskRequest } from '@/components/editor/selection-ask-request'
import { structuredAgentSessionTabId } from '../../../shared/structured-agent-session-projection'
import type { TuiAgent } from '../../../shared/tui-agent'

/**
 * Opens a chat on the selected lines: a new tab in the selection's workspace, with the question
 * already sent, wrapped the way Ask mode wraps every other prompt.
 */
export function launchSelectionAsk({
  request,
  question,
  agent,
  seedOverlay
}: {
  request: SelectionAskRequest
  question: string
  agent: TuiAgent
  seedOverlay?: Readonly<Record<string, string>>
}): boolean {
  const store = useAppStore.getState()
  const prompt = buildSelectionAskPrompt({
    question: question.trim(),
    relativePath: request.relativePath,
    language: request.language,
    startLine: request.startLine,
    endLine: request.endLine,
    selectedText: request.selectedText,
    simplifyMark: resolveSimplifyPromptMark(store.settings?.nativeChatPromptMarks)
  })
  const result = launchAgentInNewTab({
    requestId: newAgentLaunchRequestId(),
    agent,
    worktreeId: request.worktreeId,
    prompt,
    promptDelivery: 'auto-submit',
    ...(seedOverlay ? { seedOverlay } : {}),
    launchSource: 'editor_selection_ask'
  })
  if (!result) {
    return false
  }
  const label = selectionAskTabLabel(request)
  // Why: the provisional tab is labelled from the agent; only the settled session has a tab to rename.
  void result.structuredSettlement
    ?.then((settlement) => {
      if (settlement.kind === 'structured') {
        useAppStore
          .getState()
          .setTabCustomLabel(structuredAgentSessionTabId(settlement.sessionId), label, {
            recordInteraction: false
          })
      }
    })
    .catch((error: unknown) => console.error('Ask launch did not settle', error))
  return true
}
