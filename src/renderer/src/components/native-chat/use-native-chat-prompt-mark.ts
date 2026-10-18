import { useMemo, useState } from 'react'
import { useAppStore } from '../../store'
import {
  normalizeNativeChatPromptMarks,
  type NativeChatPromptMark
} from '../../../../shared/native-chat-prompt-marks'

/** The prompt marks from Settings, and which one this composer is attaching. */
export function useNativeChatPromptMark(): {
  marks: readonly NativeChatPromptMark[]
  active: NativeChatPromptMark | null
  setActiveId: (id: string | null) => void
} {
  const [activeId, setActiveId] = useState<string | null>(null)
  const stored = useAppStore((state) => state.settings?.nativeChatPromptMarks)
  const settingsLoaded = useAppStore((state) => state.settings !== null)
  const marks = useMemo(
    () => (settingsLoaded ? normalizeNativeChatPromptMarks(stored) : []),
    [settingsLoaded, stored]
  )
  return {
    marks,
    active: marks.find((mark) => mark.id === activeId) ?? null,
    setActiveId
  }
}
