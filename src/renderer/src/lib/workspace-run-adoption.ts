import { useAppStore } from '@/store'

const staleScanResultsByWorktreeId = new Map<string, Set<object>>()

function scanResultsForWorktree(worktreeId: string): object[] {
  const scans = useAppStore.getState().workspacePortScansByKey
  const results: object[] = []
  for (const scan of Object.values(scans)) {
    const includesWorktree = scan.ports.some(
      (port) => port.kind === 'workspace' && port.owner.worktreeId === worktreeId
    )
    if (includesWorktree) {
      results.push(scan)
    }
  }
  return results
}

/** Ignore a stale port scan that still lists processes Stop just killed. */
export function suppressWorkspaceRunAdoption(worktreeId: string): void {
  staleScanResultsByWorktreeId.set(worktreeId, new Set(scanResultsForWorktree(worktreeId)))
}

export function workspaceRunAdoptionBlocked(worktreeId: string): boolean {
  const stale = staleScanResultsByWorktreeId.get(worktreeId)
  if (!stale || stale.size === 0) {
    staleScanResultsByWorktreeId.delete(worktreeId)
    return false
  }
  const current = scanResultsForWorktree(worktreeId)
  if (current.some((result) => stale.has(result))) {
    return true
  }
  staleScanResultsByWorktreeId.delete(worktreeId)
  return false
}
