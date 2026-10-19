import {
  getAutomationKind,
  type Automation,
  type AutomationDispatchResult,
  type AutomationRun
} from '../../shared/automations-types'
import { NO_REVIEW_SURFACE } from '../../shared/no-review-surface'
import { PULL_REQUEST_SYNC_NO_OP_TEXT } from '../../shared/pull-request-sync-summary'
import type { AutomationRunWriter } from './automation-run-writer'
import {
  describeScheduledRefusal,
  missedBeyondGrace,
  NO_DISPATCH_HOST,
  recordMissedRun
} from './dispatch-refusal'
import type { AutomationRunTargetResult } from './run-target-resolution'

export function pullRequestSyncManualTarget(automation: {
  kind?: Automation['kind']
}): AutomationRunTargetResult | null {
  if (getAutomationKind(automation) !== 'pull_request_sync') {
    return null
  }
  return { ok: false, error: NO_DISPATCH_HOST }
}

export async function takeFoldedPullRequestSyncNoOp(
  runs: AutomationRunWriter,
  result: AutomationDispatchResult
): Promise<AutomationRun | null> {
  if (
    result.status !== 'completed' ||
    result.outputSnapshot?.content !== PULL_REQUEST_SYNC_NO_OP_TEXT
  ) {
    return null
  }
  return await runs.foldNoOp(result)
}

type DueAutomationDispatch = {
  automation: Automation
  now: number
  generation: number
  headless: boolean
  runs: AutomationRunWriter
  canDispatchToRenderer: () => boolean
  requestDispatch: (
    automation: Automation,
    run: AutomationRun,
    target: AutomationRunTargetResult,
    generation: number
  ) => Promise<AutomationRun>
}

export async function evaluateDueAutomation(
  input: DueAutomationDispatch & {
    tickMs: number
    latestOccurrence: (automation: Automation, now: number) => number | null
    resolveTarget: (automation: Automation) => AutomationRunTargetResult
  }
): Promise<void> {
  const { automation, now, generation, runs } = input
  const scheduledFor = input.latestOccurrence(automation, now)
  if (scheduledFor === null) {
    await runs.advanceNextRun(automation.id, now)
    return
  }
  if (missedBeyondGrace({ automation, scheduledFor, now, tickMs: input.tickMs })) {
    await recordMissedRun({ runs, automation, scheduledFor })
    await runs.advanceNextRun(automation.id, now)
    return
  }
  if (getAutomationKind(automation) === 'pull_request_sync') {
    await evaluatePullRequestSync(input, scheduledFor)
    return
  }
  // Resolved before the run exists: a refusal repeats every occurrence, and a
  // */5 automation would otherwise write ~288 identical rows a day — past
  // retention, which would evict the automation's real history.
  const target = input.resolveTarget(automation)
  const canDispatch = input.canDispatchToRenderer() || input.headless
  const refusal = describeScheduledRefusal({ target, canDispatch })
  if (refusal && (await runs.repeatSkip(automation.id, refusal, scheduledFor))) {
    await runs.advanceNextRun(automation.id, now)
    return
  }
  await input.requestDispatch(
    automation,
    await runs.createRun(automation, scheduledFor),
    target,
    generation
  )
  await runs.advanceNextRun(automation.id, now)
}

async function evaluatePullRequestSync(
  input: DueAutomationDispatch,
  scheduledFor: number
): Promise<void> {
  const { automation, now, generation, runs } = input
  const refusal = input.canDispatchToRenderer()
    ? null
    : input.headless
      ? NO_REVIEW_SURFACE
      : NO_DISPATCH_HOST
  if (refusal && (await runs.repeatSkip(automation.id, refusal, scheduledFor))) {
    await runs.advanceNextRun(automation.id, now)
    return
  }
  await input.requestDispatch(
    automation,
    await runs.createRun(automation, scheduledFor),
    { ok: false, error: refusal ?? NO_DISPATCH_HOST },
    generation
  )
  await runs.advanceNextRun(automation.id, now)
}
