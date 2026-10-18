import { isSlashCommandDraft } from './native-chat-slash-commands'

/** Where the instruction sits relative to the message the user typed. */
export type NativeChatPromptMarkPlacement = 'prefix' | 'suffix'

/**
 * A model-agnostic instruction attached to one chat message.
 * It is not an agent skill and not Ask mode: the text is joined onto the send.
 */
export type NativeChatPromptMark = {
  id: string
  name: string
  prompt: string
  placement: NativeChatPromptMarkPlacement
}

export const SIMPLIFY_PROMPT_MARK_ID = 'simplify'

export const SIMPLIFY_PROMPT_MARK_PROMPT =
  'Answer in a few short sentences of plain language. Say what this is and how the pieces fit. Keep file, function, and command names exact. No headers, no long lists, no line-by-line retelling, and no extra background.'

export const MAX_NATIVE_CHAT_PROMPT_MARKS = 20
export const MAX_NATIVE_CHAT_PROMPT_MARK_NAME_LENGTH = 40
export const MAX_NATIVE_CHAT_PROMPT_MARK_PROMPT_LENGTH = 4000

export function defaultNativeChatPromptMarks(): NativeChatPromptMark[] {
  return [
    {
      id: SIMPLIFY_PROMPT_MARK_ID,
      name: 'Simplify',
      prompt: SIMPLIFY_PROMPT_MARK_PROMPT,
      placement: 'prefix'
    }
  ]
}

function clamp(value: string, max: number): string {
  return value.length > max ? value.slice(0, max) : value
}

/** Missing settings get Simplify. A saved list, including an empty one, is kept. */
export function normalizeNativeChatPromptMarks(input: unknown): NativeChatPromptMark[] {
  if (!Array.isArray(input)) {
    return defaultNativeChatPromptMarks()
  }

  const marks: NativeChatPromptMark[] = []
  const seenIds = new Set<string>()
  for (const item of input) {
    if (marks.length >= MAX_NATIVE_CHAT_PROMPT_MARKS) {
      break
    }
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      continue
    }
    const record = item as Record<string, unknown>
    const id = typeof record.id === 'string' ? record.id.trim() : ''
    if (!id || seenIds.has(id)) {
      continue
    }
    const name = clamp(
      typeof record.name === 'string' ? record.name.trim() : '',
      MAX_NATIVE_CHAT_PROMPT_MARK_NAME_LENGTH
    )
    const prompt = clamp(
      typeof record.prompt === 'string' ? record.prompt.trim() : '',
      MAX_NATIVE_CHAT_PROMPT_MARK_PROMPT_LENGTH
    )
    if (!name && !prompt) {
      continue
    }
    seenIds.add(id)
    marks.push({
      id,
      name,
      prompt,
      placement: record.placement === 'suffix' ? 'suffix' : 'prefix'
    })
  }
  return marks
}

/** Joins a mark onto a chat message. Slash commands are left alone. */
export function messageWithNativeChatPromptMark(
  text: string,
  mark: NativeChatPromptMark | null | undefined
): string {
  const instruction = mark?.prompt.trim() ?? ''
  if (!instruction || isSlashCommandDraft(text)) {
    return text
  }
  const body = text.trim()
  if (!body) {
    return instruction
  }
  return mark?.placement === 'suffix' ? `${body}\n\n${instruction}` : `${instruction}\n\n${body}`
}
