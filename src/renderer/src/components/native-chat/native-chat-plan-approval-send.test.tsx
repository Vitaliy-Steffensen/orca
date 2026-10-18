// @vitest-environment happy-dom

// A plan waiting on the user turns the composer into its answer: what is typed is what to change
// about the plan, not a new turn.

import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useNativeChatComposerSubmit } from './use-native-chat-composer-submit'
import type { NativeChatPlanApproval } from './use-native-chat-plan-approval'

function planApproval(overrides: Partial<NativeChatPlanApproval> = {}) {
  const revise = vi.fn()
  const base: NativeChatPlanApproval = {
    planText: '# Plan',
    acceptsNote: true,
    isSubmitting: false,
    approve: vi.fn(),
    keepPlanning: vi.fn(),
    revise
  }
  // `revise` last so it stays the spy whatever the override carries.
  return { ...base, ...overrides, revise }
}

function setup(args: { draft: string; plan?: NativeChatPlanApproval }) {
  const sendStructured = vi.fn()
  const setDraft = vi.fn()
  const hook = renderHook(() =>
    useNativeChatComposerSubmit({
      // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: the submit hook reads only `threadGoal` off the transport.
      structuredTransport: { threadGoal: undefined } as never,
      draftScopeKey: 'scope',
      draft: args.draft,
      caret: args.draft.length,
      imageAttachments: [],
      disabled: false,
      sendPty: vi.fn(),
      sendStructured,
      setDraft,
      setCaret: vi.fn(),
      ...(args.plan ? { planApproval: args.plan } : {})
    })
  )
  return { send: hook.result.current.send, sendStructured, setDraft }
}

describe('sending while a plan waits', () => {
  it('sends the typed text back as plan adjustments, not as a new turn', () => {
    const plan = planApproval()
    const { send, sendStructured, setDraft } = setup({ draft: 'Split step 3 in two.', plan })

    send()

    expect(plan.revise).toHaveBeenCalledWith('Split step 3 in two.')
    expect(sendStructured).not.toHaveBeenCalled()
    expect(setDraft).toHaveBeenCalledWith('')
  })

  it('does nothing on an empty draft, rather than denying the plan blankly', () => {
    const plan = planApproval()
    const { send, sendStructured } = setup({ draft: '   ', plan })

    send()

    expect(plan.revise).not.toHaveBeenCalled()
    expect(sendStructured).not.toHaveBeenCalled()
  })

  it('stays an ordinary message when the host cannot carry the adjustments', () => {
    // The field is hidden in that case, so the composer must behave as it always did.
    const plan = planApproval({ acceptsNote: false })
    const { send, sendStructured } = setup({ draft: 'hello', plan })

    send()

    expect(plan.revise).not.toHaveBeenCalled()
    expect(sendStructured).toHaveBeenCalledWith('hello', [])
  })

  it('is an ordinary message when no plan is waiting', () => {
    const { send, sendStructured } = setup({ draft: 'hello' })

    send()

    expect(sendStructured).toHaveBeenCalledWith('hello', [])
  })
})
