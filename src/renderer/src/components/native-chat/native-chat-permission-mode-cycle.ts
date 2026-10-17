import { useCallback } from 'react'
import type {
  SessionOptionDescriptor,
  SessionOptionsSurface
} from '../../../../shared/native-chat-session-options'

/** Claude Code's own Shift+Tab order. Bypass is not a position: a session that has
 *  left it cannot switch back, so cycling into it would lie. */
export const PERMISSION_MODE_CYCLE = ['default', 'acceptEdits', 'plan'] as const

const NEXT_BY_MODE = new Map<string, string>(
  PERMISSION_MODE_CYCLE.map((mode, index) => [
    mode,
    PERMISSION_MODE_CYCLE[(index + 1) % PERMISSION_MODE_CYCLE.length]
  ])
)

export function nextPermissionMode(current: string | undefined): string {
  // No reported value is not a fourth position: nothing has said the session left the
  // catalog default, so the first press advances from it rather than re-sending it.
  // A named mode off the cycle (a launch's `dontAsk`, say) does reset to the top —
  // there the value IS known, and stepping anywhere else would guess.
  return NEXT_BY_MODE.get(current ?? PERMISSION_MODE_CYCLE[0]) ?? PERMISSION_MODE_CYCLE[0]
}

function settablePermissionMode(
  snapshot: readonly SessionOptionDescriptor[]
): SessionOptionDescriptor | null {
  const descriptor = snapshot.find((entry) => entry.id === 'permissionMode')
  return descriptor?.settable && descriptor.kind.type === 'select' ? descriptor : null
}

/** Advances the live session's permission mode. Returns false when this chat has no
 *  settable one, so Shift+Tab keeps its focus-traversal meaning there. */
export function useNativeChatPermissionModeCycle(
  surface: SessionOptionsSurface | null,
  snapshot: readonly SessionOptionDescriptor[]
): () => boolean {
  return useCallback(() => {
    const descriptor = settablePermissionMode(snapshot)
    if (!surface || !descriptor || descriptor.kind.type !== 'select') {
      return false
    }
    void surface.setOption('permissionMode', nextPermissionMode(descriptor.kind.currentValue))
    return true
  }, [snapshot, surface])
}
