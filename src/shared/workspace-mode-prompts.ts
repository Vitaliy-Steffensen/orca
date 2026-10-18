import {
  messageWithNativeChatPromptMark,
  type NativeChatPromptMark
} from './native-chat-prompt-marks'
import { isSlashCommandDraft } from './native-chat-slash-commands'
import type { WorkspaceMode } from './workspace-mode'

const SCOPE =
  'Read the relevant code first. Scope the approach, affected files, and data models. Identify feasibility concerns grounded in what you actually read, and any underlying blocker that must be fixed first.'
const PREAMBLES = {
  supervised: `${SCOPE} Then stop before writing anything and grill me on what is genuinely unresolved. Ask only questions the code cannot answer.`,
  autonomous: `${SCOPE} Carry the task through without stopping for routine decisions. If it is materially bigger than it appeared or blocked on an underlying issue, stop and write up what you found rather than pushing on.`
}

export function promptForWorkspaceMode(
  mode: WorkspaceMode,
  userPrompt: string,
  simplifyMark?: NativeChatPromptMark | null
): string {
  if (
    !userPrompt.trim() ||
    isSlashCommandDraft(userPrompt) ||
    /^https?:\/\/\S+$/.test(userPrompt.trim())
  ) {
    return userPrompt
  }
  return mode === 'ask'
    ? messageWithNativeChatPromptMark(userPrompt, simplifyMark)
    : `${PREAMBLES[mode]}\n\n${userPrompt}`
}
