import type { StateCreator } from 'zustand'
import type { AppState } from '../types'
import type { WorkspaceRunEntry } from '@/lib/workspace-run-transition'

export type WorkspaceRunSlice = {
  workspaceRunByWorktreeId: Record<string, WorkspaceRunEntry>
  setWorkspaceRun: (worktreeId: string, entry: WorkspaceRunEntry) => void
  clearWorkspaceRun: (worktreeId: string) => void
}

export const createWorkspaceRunSlice: StateCreator<AppState, [], [], WorkspaceRunSlice> = (
  set
) => ({
  workspaceRunByWorktreeId: {},
  setWorkspaceRun: (worktreeId, entry) => {
    set((state) => {
      if (state.workspaceRunByWorktreeId[worktreeId] === entry) {
        return state
      }
      return {
        workspaceRunByWorktreeId: { ...state.workspaceRunByWorktreeId, [worktreeId]: entry }
      }
    })
  },
  clearWorkspaceRun: (worktreeId) => {
    set((state) => {
      if (!state.workspaceRunByWorktreeId[worktreeId]) {
        return state
      }
      const next = { ...state.workspaceRunByWorktreeId }
      delete next[worktreeId]
      return { workspaceRunByWorktreeId: next }
    })
  }
})
