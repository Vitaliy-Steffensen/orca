import { useCallback, useEffect, useMemo, useState } from 'react'
import type { RuntimeClientTarget } from '../../../../shared/runtime-client-target'
import type { AgentSessionPromptResponse } from '../../../../shared/agent-session-question-answer'
import {
  isPlanApprovalSubject,
  pendingPlanApproval
} from '../../../../shared/agent-session-approval-subject'
import { supportsStructuredAgentSessionApprovalNote } from '@/runtime/structured-agent-session-client'
import type { StructuredPromptItem } from './structured-agent-session-message-projection'

/** The plan decision the composer carries while a plan waits. `acceptsNote` is false against a
 *  host that cannot take free text, where the adjustments field is withheld rather than offered
 *  and then dropped. */
export type NativeChatPlanApproval = {
  planText: string
  acceptsNote: boolean
  isSubmitting: boolean
  approve: () => void
  /** Deny with revisions, so the agent plans again with this feedback. */
  revise: (note: string) => void
  /** Deny with nothing said. The bar's own button where the host cannot carry a note; typing is
   *  the only other way back to planning and that needs one. */
  keepPlanning: () => void
}

export function useNativeChatPlanApproval(args: {
  prompts: readonly StructuredPromptItem[]
  target: RuntimeClientTarget
  respond: (item: StructuredPromptItem, response: AgentSessionPromptResponse) => void
  holds: (item: StructuredPromptItem) => boolean
}): NativeChatPlanApproval | null {
  const { prompts, target, respond, holds } = args
  const plan = useMemo(() => pendingPlanApproval(prompts), [prompts])
  const [acceptsNote, setAcceptsNote] = useState(false)
  useEffect(() => {
    if (!plan) {
      return
    }
    let active = true
    void supportsStructuredAgentSessionApprovalNote(target).then((supported) => {
      if (active) {
        setAcceptsNote(supported)
      }
    })
    return () => {
      active = false
    }
  }, [plan, target])
  const approve = useCallback(() => {
    if (plan) {
      respond(plan, { kind: 'option', optionId: 'allow' })
    }
  }, [plan, respond])
  const revise = useCallback(
    (note: string) => {
      const trimmed = note.trim()
      if (plan && trimmed) {
        respond(plan, { kind: 'option', optionId: 'deny', note: trimmed })
      }
    },
    [plan, respond]
  )
  const keepPlanning = useCallback(() => {
    if (plan) {
      respond(plan, { kind: 'option', optionId: 'deny' })
    }
  }, [plan, respond])
  return useMemo(
    () =>
      plan && plan.body.kind === 'approval' && isPlanApprovalSubject(plan.body.subject)
        ? {
            planText: plan.body.subject.text,
            acceptsNote,
            isSubmitting: holds(plan),
            approve,
            revise,
            keepPlanning
          }
        : null,
    [acceptsNote, approve, holds, keepPlanning, plan, revise]
  )
}
