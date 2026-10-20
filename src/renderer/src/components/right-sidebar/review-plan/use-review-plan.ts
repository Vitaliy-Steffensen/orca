import { useEffect, useState } from 'react'
import { useAppStore } from '@/store'
import { getConnectionIdFromState } from '@/lib/connection-context'
import { runtimeTargetForWorkspaceOwner } from '@/lib/resolve-owner'
import { joinPath } from '@/lib/path'
import { readRuntimeFileContent } from '@/runtime/runtime-file-read-client'
import {
  parseReviewPlan,
  REVIEW_PLAN_RELATIVE_PATH,
  type ReviewPlan
} from '../../../../../shared/review-plan'

export type ReviewPlanState =
  | { status: 'loading' }
  | { status: 'missing' }
  | { status: 'invalid' }
  | { status: 'ready'; plan: ReviewPlan }

const POLL_INTERVAL_MS = 3000

async function readReviewPlan(worktreeId: string): Promise<ReviewPlanState> {
  const state = useAppStore.getState()
  const worktree = state.getKnownWorktreeById(worktreeId)
  const target = runtimeTargetForWorkspaceOwner(state, { workspaceId: worktreeId })
  const connectionId = getConnectionIdFromState(state, worktreeId)
  // Why: an undefined connection means the owner is unresolved, and reading would guess a host.
  if (!worktree || !target || connectionId === undefined) {
    return { status: 'missing' }
  }
  try {
    const file = await readRuntimeFileContent({
      target,
      worktreeId,
      filePath: joinPath(worktree.path, REVIEW_PLAN_RELATIVE_PATH),
      relativePath: REVIEW_PLAN_RELATIVE_PATH,
      connectionId: connectionId ?? undefined
    })
    const plan = file.isBinary ? null : parseReviewPlan(file.content)
    return plan ? { status: 'ready', plan } : { status: 'invalid' }
  } catch {
    // Why one answer: a missing file and an unreadable one both mean "no plan to show yet".
    return { status: 'missing' }
  }
}

// Why polling rather than a file watch: the plan is one small file the agent rewrites a few times
// a run, and a poll reuses the same read path for local, SSH and paired-server worktrees.
export function useReviewPlan(worktreeId: string | null): ReviewPlanState {
  const [result, setResult] = useState<{ worktreeId: string; state: ReviewPlanState } | null>(null)
  useEffect(() => {
    if (!worktreeId) {
      return
    }
    let cancelled = false
    let lastJson = ''
    const refresh = async (): Promise<void> => {
      const next = await readReviewPlan(worktreeId)
      const json = JSON.stringify(next)
      if (cancelled || json === lastJson) {
        return
      }
      lastJson = json
      setResult({ worktreeId, state: next })
    }
    void refresh()
    const timer = window.setInterval(() => void refresh(), POLL_INTERVAL_MS)
    window.addEventListener('focus', refresh)
    return () => {
      cancelled = true
      window.clearInterval(timer)
      window.removeEventListener('focus', refresh)
    }
  }, [worktreeId])
  return result && result.worktreeId === worktreeId ? result.state : { status: 'loading' }
}
