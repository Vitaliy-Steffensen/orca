import type { WorkspaceAgentObservation } from './workspace-agent-status-rules'

/**
 * How long every agent in a workspace must read as done before the workspace is
 * released from a holding lane. A queue drains one prompt at a time, and the gap
 * between two of them reads as done; releasing on the first idle tick would hand
 * the card to the pull request rules halfway through a run.
 */
export const DEFAULT_AUTOMATION_HOLD_SETTLE_MS = 30_000

/** What a workspace's run has looked like, and since when, across ticks. */
export type AutomationHoldEntry = {
  /** When the run first read as finished; reset to null the moment anything runs again. */
  finishedSince: number | null
}

export type AutomationHoldOutcome = {
  /** Carry into the next tick; null drops the workspace from the tracker. */
  entry: AutomationHoldEntry | null
  /** The run is over and has stayed over, so rules may move this workspace again. */
  released: boolean
}

/**
 * Whether nothing is running. A workspace with no observed agents is not finished —
 * it is unobserved, and releasing on no evidence is how a held card escapes early.
 */
export function isAutomationRunFinished(agents: readonly WorkspaceAgentObservation[]): boolean {
  return agents.length > 0 && agents.every((agent) => agent.state === 'done')
}

export function advanceAutomationHold(args: {
  previous: AutomationHoldEntry | null | undefined
  isFinished: boolean
  now: number
  settleMs?: number
}): AutomationHoldOutcome {
  const { previous, isFinished, now } = args
  const settleMs = args.settleMs ?? DEFAULT_AUTOMATION_HOLD_SETTLE_MS
  if (!isFinished) {
    return { entry: { finishedSince: null }, released: false }
  }
  const finishedSince = previous?.finishedSince ?? now
  return {
    entry: { finishedSince },
    released: now - finishedSince >= settleMs
  }
}
