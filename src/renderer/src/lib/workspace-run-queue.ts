const chains = new Map<string, Promise<void>>()

/** Serializes start and stop for one workspace so a double-click cannot interleave them. */
export function enqueueWorkspaceRun(worktreeId: string, task: () => Promise<void>): Promise<void> {
  const previous = chains.get(worktreeId) ?? Promise.resolve()
  const next = previous.catch(() => undefined).then(task)
  const tracked = next.finally(() => {
    if (chains.get(worktreeId) === tracked) {
      chains.delete(worktreeId)
    }
  })
  chains.set(worktreeId, tracked)
  return tracked
}
