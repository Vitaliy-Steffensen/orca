import { callRuntimeRpc } from './runtime-rpc-client'
import { toRuntimeWorktreeSelector } from './runtime-worktree-selector'

export function announceActiveWorktreeToCompanion(worktreeId: string): void {
  void callRuntimeRpc(
    { kind: 'local' },
    'worktree.activate',
    {
      worktree: toRuntimeWorktreeSelector(worktreeId),
      notifyClients: false,
      navigation: 'companion'
    },
    { skipCompatibilityCheck: true, suppressFeatureInteraction: true }
  ).catch(() => {})
}
