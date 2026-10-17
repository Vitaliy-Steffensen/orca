import { useCallback, useRef } from 'react'
import type {
  SessionOptionDescriptor,
  SessionOptionsSurface
} from '../../../../shared/native-chat-session-options'

const PLAN_MODE = 'plan'
const NORMAL_MODE = 'default'

/** Shift+Tab is a plan switch, not a tour of every mode: it turns Plan on, and turns it
 *  off back to the mode the chat was in. Accept edits stays reachable from the picker. */
export function planModeToggleTarget(current: string | undefined, restore: string): string {
  return current === PLAN_MODE ? restore : PLAN_MODE
}

function settablePermissionMode(
  snapshot: readonly SessionOptionDescriptor[]
): SessionOptionDescriptor | null {
  const descriptor = snapshot.find((entry) => entry.id === 'permissionMode')
  return descriptor?.settable && descriptor.kind.type === 'select' ? descriptor : null
}

/** Turns Plan on and off. Returns false when this chat has no settable permission mode,
 *  so Shift+Tab keeps its focus-traversal meaning there. */
export function useNativeChatPlanModeToggle(
  surface: SessionOptionsSurface | null,
  snapshot: readonly SessionOptionDescriptor[]
): () => boolean {
  // What leaving Plan goes back to. Read at the press rather than from an effect: the
  // reported mode can change between renders, and only the value we left matters.
  const beforePlan = useRef(NORMAL_MODE)
  return useCallback(() => {
    const descriptor = settablePermissionMode(snapshot)
    if (!surface || !descriptor || descriptor.kind.type !== 'select') {
      return false
    }
    const current = descriptor.kind.currentValue
    if (current !== undefined && current !== PLAN_MODE) {
      beforePlan.current = current
    }
    void surface.setOption('permissionMode', planModeToggleTarget(current, beforePlan.current))
    return true
  }, [snapshot, surface])
}
