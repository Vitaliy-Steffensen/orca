import { ipcRenderer } from 'electron'
import type { WorkspaceRunCredentialsApi } from './workspace-run-credentials-api'

export const workspaceRunCredentialsApi: WorkspaceRunCredentialsApi = {
  set: (id, password) => ipcRenderer.invoke('workspaceRunCredentials:set', id, password),
  has: (id) => ipcRenderer.invoke('workspaceRunCredentials:has', id),
  clear: (id) => ipcRenderer.invoke('workspaceRunCredentials:clear', id),
  login: (args) => ipcRenderer.invoke('workspaceRunCredentials:login', args)
}
