// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FileFindToggle } from './FileFindToggle'

afterEach(cleanup)

function toggle(expanded: boolean, hasQuery = false) {
  const onToggle = vi.fn()
  render(
    <FileFindToggle
      expanded={expanded}
      onToggle={onToggle}
      hasQuery={hasQuery}
      label="Filter files by name"
      testId="find-toggle"
    />
  )
  return { onToggle, button: screen.getByTestId('find-toggle') }
}

describe('FileFindToggle', () => {
  it('opens the bar when it is collapsed', () => {
    const { onToggle, button } = toggle(false)
    expect(button).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(button)
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it('closes the bar when it is already open', () => {
    const { onToggle, button } = toggle(true)
    expect(button).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(button)
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it('reads as pressed while the bar is open, even with no query', () => {
    const { button } = toggle(true)
    expect(button.className).toContain('bg-muted')
  })

  it('marks a filter that is still narrowing the list while collapsed', () => {
    const { button } = toggle(false, true)
    expect(button.className).toContain('bg-muted')
    expect(button.querySelector('span.rounded-full')).not.toBeNull()
    cleanup()
    expect(toggle(false).button.querySelector('span.rounded-full')).toBeNull()
  })
})
