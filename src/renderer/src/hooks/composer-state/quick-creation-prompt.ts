import { promptForWorkspaceMode } from '../../../../shared/workspace-mode-prompts'
import {
  normalizeNativeChatPromptMarks,
  SIMPLIFY_PROMPT_MARK_ID
} from '../../../../shared/native-chat-prompt-marks'
import type { WorkspaceMode } from '../../../../shared/workspace-mode'
import { extractWorkspacePromptTaskLink } from '@/lib/workspace-prompt-task-link'
import { resolveQuickCreateLinkedWorkItemPrompt } from '@/lib/linked-work-item-context'

export function buildWrappedQuickCreationPrompts(input: {
  agent: unknown
  agentPrompt: string
  submitLinkedWorkItem: Parameters<typeof resolveQuickCreateLinkedWorkItemPrompt>[0]
  trimmedNote: string
  nativeChatPromptMarks: Parameters<typeof normalizeNativeChatPromptMarks>[0]
  workspaceMode?: WorkspaceMode
}): { quickPrompt: string; quickDraftPrompt: string | null } {
  const promptLinkedWorkItem = input.agent === null ? null : input.submitLinkedWorkItem
  const linkedPrompt = resolveQuickCreateLinkedWorkItemPrompt(
    promptLinkedWorkItem,
    input.trimmedNote
  )
  const userPrompt = input.agentPrompt.trim()
  const promptIsOnlyTaskLink =
    userPrompt.length > 0 && extractWorkspacePromptTaskLink(userPrompt)?.url === userPrompt
  const { prompt: mergedPrompt, draftPrompt: mergedDraftPrompt } =
    userPrompt && !promptIsOnlyTaskLink
      ? {
          prompt: linkedPrompt.draftPrompt
            ? `${userPrompt}\n\n${linkedPrompt.draftPrompt}`
            : userPrompt,
          draftPrompt: null
        }
      : linkedPrompt

  const simplifyMark = normalizeNativeChatPromptMarks(input.nativeChatPromptMarks).find(
    (mark) => mark.id === SIMPLIFY_PROMPT_MARK_ID
  )
  const wrapPrompt = (prompt: string): string =>
    input.workspaceMode && !promptIsOnlyTaskLink
      ? promptForWorkspaceMode(input.workspaceMode, prompt, simplifyMark)
      : prompt

  return {
    quickPrompt: wrapPrompt(mergedPrompt),
    quickDraftPrompt: mergedDraftPrompt ? wrapPrompt(mergedDraftPrompt) : mergedDraftPrompt
  }
}
