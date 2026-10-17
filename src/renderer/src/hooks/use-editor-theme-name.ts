import { useEffect, useState } from 'react'
import { editorThemeName, ensureCustomEditorThemes } from '@/lib/custom-editor-theme'

/**
 * The Monaco theme name for the current mode, re-rendering once the user's themes are registered.
 *
 * Why the state bump: `defineTheme` lands after first paint, and Monaco ignores a theme it does not
 * yet know, so a call site that reads `editorThemeName` only on mount keeps the stock colours.
 */
export function useEditorThemeName(isDark: boolean): string {
  const [, setCustomThemesReady] = useState(false)
  useEffect(() => {
    let cancelled = false
    void ensureCustomEditorThemes().then(() => {
      if (!cancelled) {
        setCustomThemesReady(true)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])
  return editorThemeName(isDark)
}
