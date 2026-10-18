import { expect, it } from 'vitest'
import {
  DRAWN_APPROVAL_SUBJECT_KINDS,
  isNewerApprovalSubject,
  pendingPlanApproval,
  pendingPromptsAllUnanswerableHere
} from './agent-session-approval-subject'
import type { AgentJournalItemBody } from './agent-session-journal-types'
import { AGENT_JOURNAL_APPROVAL_SUBJECT_KINDS } from './agent-session-journal-schemas'

it('draws exactly the subject kinds the journal schema knows', () => {
  expect([...DRAWN_APPROVAL_SUBJECT_KINDS].sort()).toEqual(
    [...AGENT_JOURNAL_APPROVAL_SUBJECT_KINDS].sort()
  )
})

it("reads only a subject of a kind it does not draw as a newer build's", () => {
  expect(isNewerApprovalSubject(undefined)).toBe(false)
  expect(isNewerApprovalSubject({ kind: 'plan' })).toBe(false)
  expect(isNewerApprovalSubject({ kind: 'diff' })).toBe(true)
})

function pending(body: Record<string, unknown>): { body: AgentJournalItemBody } {
  return JSON.parse(
    JSON.stringify({
      body: {
        ...body,
        resolution: { state: 'pending', selectedOptionId: null, resolvedBy: null, resolvedAt: null }
      }
    })
  )
}
const NEWER = pending({
  kind: 'approval',
  title: 'Review',
  detail: null,
  subject: { kind: 'diff' },
  options: [{ id: 'allow', label: 'Approve' }]
})
const PLAN = pending({
  kind: 'approval',
  title: 'Plan',
  detail: null,
  subject: { kind: 'plan', text: 'do it' },
  options: [{ id: 'allow', label: 'Approve' }]
})
const QUESTION = pending({ kind: 'question', title: 'Which?', options: [] })

it('holds only while every pending prompt is an approval this build cannot answer', () => {
  expect(pendingPromptsAllUnanswerableHere([])).toBe(false)
  expect(pendingPromptsAllUnanswerableHere([NEWER])).toBe(true)
  expect(pendingPromptsAllUnanswerableHere([NEWER, NEWER])).toBe(true)
  expect(pendingPromptsAllUnanswerableHere([NEWER, PLAN])).toBe(false)
  expect(pendingPromptsAllUnanswerableHere([QUESTION, NEWER])).toBe(false)
  const cancelled = JSON.parse(
    JSON.stringify(NEWER).replace('"state":"pending"', '"state":"cancelled"')
  )
  expect(pendingPromptsAllUnanswerableHere([cancelled, PLAN])).toBe(false)
  expect(pendingPromptsAllUnanswerableHere([cancelled])).toBe(false)
})

it('names the lone waiting plan, which is what keeps the composer open', () => {
  expect(pendingPlanApproval([PLAN])).toBe(PLAN)
  expect(pendingPlanApproval([])).toBeNull()
  // Anything else waiting wants the slot too, so the card takes it back.
  expect(pendingPlanApproval([PLAN, QUESTION])).toBeNull()
  expect(pendingPlanApproval([PLAN, NEWER])).toBeNull()
  expect(pendingPlanApproval([PLAN, PLAN])).toBeNull()
  expect(pendingPlanApproval([NEWER])).toBeNull()
  expect(pendingPlanApproval([QUESTION])).toBeNull()
})

it('ignores a plan that is no longer pending', () => {
  const resolved = JSON.parse(
    JSON.stringify(PLAN).replace('"state":"pending"', '"state":"resolved"')
  )
  expect(pendingPlanApproval([resolved])).toBeNull()
})
