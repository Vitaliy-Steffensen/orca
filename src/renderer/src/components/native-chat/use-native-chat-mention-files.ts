import { useAppStore } from '@/store'
import {
  useWorktreeMentionFiles,
  type WorktreeMentionFiles
} from '@/lib/use-worktree-mention-files'
import { findTerminalTabWorktreeId } from './native-chat-file-link'

export type NativeChatMentionFiles = WorktreeMentionFiles

/** `query` is null while no `@` token is open. */
export function useNativeChatMentionFiles(args: {
  query: string | null
  terminalTabId: string
  structuredWorktreeId?: string
}): NativeChatMentionFiles {
  const { query, terminalTabId, structuredWorktreeId } = args
  const enabled = query !== null
  // Closed is the common state, so the tab scan only runs while a token is open.
  const worktreeId = useAppStore((state) =>
    enabled
      ? (structuredWorktreeId ?? findTerminalTabWorktreeId(state.tabsByWorktree, terminalTabId))
      : null
  )
  return useWorktreeMentionFiles(query, worktreeId)
}
