// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { reloadSavedDraftsForTests } from '@/lib/saved-drafts'
import { TooltipProvider } from '@/components/ui/tooltip'
import { RightPanelCommentComposer } from './right-panel-comment-composer'

vi.mock('@/components/github/ReviewMarkdownComposer', () => ({
  ReviewMarkdownComposer: ({
    value,
    onChange,
    placeholder
  }: {
    value: string
    onChange: (value: string) => void
    placeholder: string
  }) => (
    <textarea
      placeholder={placeholder}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  )
}))

afterEach(() => {
  cleanup()
  localStorage.clear()
  reloadSavedDraftsForTests()
})

function renderComposer(onSubmit = vi.fn(async () => ({ ok: true as const }))) {
  return render(
    <TooltipProvider>
      <RightPanelCommentComposer
        placeholder="Reply to madsenmm"
        submitLabel="Reply"
        draftKey="reply:42"
        onSubmit={onSubmit}
      />
    </TooltipProvider>
  )
}

describe('RightPanelCommentComposer drafts', () => {
  it('brings back an unsent reply after a restart', () => {
    const first = renderComposer()
    fireEvent.change(screen.getByPlaceholderText('Reply to madsenmm'), {
      target: { value: 'Not sure about this' }
    })
    first.unmount()

    reloadSavedDraftsForTests()
    renderComposer()
    expect(screen.getByPlaceholderText('Reply to madsenmm')).toHaveProperty(
      'value',
      'Not sure about this'
    )
  })

  it('forgets the reply once it is sent', async () => {
    const first = renderComposer()
    fireEvent.change(screen.getByPlaceholderText('Reply to madsenmm'), {
      target: { value: 'Looks good' }
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Reply' }))
    })
    first.unmount()

    reloadSavedDraftsForTests()
    renderComposer()
    expect(screen.getByPlaceholderText('Reply to madsenmm')).toHaveProperty('value', '')
  })
})
