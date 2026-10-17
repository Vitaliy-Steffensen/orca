import { useEffect } from 'react'
import { useAppStore } from '@/store'
import { keybindingMatchesAction } from '../../../../../shared/keybindings/matching'
import { getShortcutPlatform } from '@/lib/shortcut-platform'

/**
 * Claims the find chord only while focus is inside the right sidebar, so Monaco, the terminal
 * and the chat find bars keep owning it everywhere else.
 */
export function useRightSidebarFindKeys(rootRef: React.RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const root = rootRef.current
      if (!root || !(event.target instanceof Node) || !root.contains(event.target)) {
        return
      }
      const state = useAppStore.getState()
      if (
        !keybindingMatchesAction('sidebar.find', event, getShortcutPlatform(), state.keybindings)
      ) {
        return
      }
      event.preventDefault()
      event.stopPropagation()
      state.requestRightSidebarFind()
    }
    window.addEventListener('keydown', onKeyDown, { capture: true })
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true })
  }, [rootRef])
}
