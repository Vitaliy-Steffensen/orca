// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { CommentReactions } from './CommentReactions'

afterEach(cleanup)

describe('CommentReactions reactors', () => {
  it('names who reacted when a chip is hovered or focused', async () => {
    render(
      <TooltipProvider delayDuration={0}>
        <CommentReactions reactions={[{ content: '+1', count: 1, reactors: ['madsenmm'] }]} />
      </TooltipProvider>
    )
    await act(async () => {
      fireEvent.focus(screen.getByLabelText('1 thumbs up reaction'))
    })
    expect((await screen.findAllByText('madsenmm reacted with 👍')).length).toBeGreaterThan(0)
  })
})
