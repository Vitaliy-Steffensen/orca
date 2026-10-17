// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

type ThemeState = { registered: boolean; resolve: (() => void) | null }
const themeState: ThemeState = vi.hoisted(() => ({
  registered: false,
  resolve: null
}))

vi.mock('@/lib/custom-editor-theme', () => ({
  ensureCustomEditorThemes: () =>
    new Promise<void>((resolve) => {
      themeState.resolve = () => {
        themeState.registered = true
        resolve()
      }
    }),
  editorThemeName: (isDark: boolean) => {
    if (!themeState.registered) {
      return isDark ? 'vs-dark' : 'vs'
    }
    return isDark ? 'orca-custom-dark' : 'orca-custom-light'
  }
}))

import { useEditorThemeName } from './use-editor-theme-name'

function Probe({ isDark }: { isDark: boolean }): React.JSX.Element {
  return <span data-testid="theme">{useEditorThemeName(isDark)}</span>
}

beforeEach(() => {
  themeState.registered = false
  themeState.resolve = null
})
afterEach(cleanup)

it('swaps off the stock theme once registration lands', async () => {
  render(<Probe isDark={true} />)
  expect(screen.getByTestId('theme').textContent).toBe('vs-dark')

  themeState.resolve?.()
  await expect.poll(() => screen.getByTestId('theme').textContent).toBe('orca-custom-dark')
})

it('does not re-render after unmount', async () => {
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
  const { unmount } = render(<Probe isDark={false} />)
  unmount()
  themeState.resolve?.()
  await Promise.resolve()
  expect(errors).not.toHaveBeenCalled()
  errors.mockRestore()
})
