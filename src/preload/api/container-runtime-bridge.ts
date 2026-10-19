import { ipcRenderer } from 'electron'
import type { ContainerRuntimeApi } from './container-runtime-api'

export const containerRuntimeApi: ContainerRuntimeApi = {
  probe: () => ipcRenderer.invoke('containerRuntime:probe'),
  start: () => ipcRenderer.invoke('containerRuntime:start')
}
