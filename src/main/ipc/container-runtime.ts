import { ipcMain } from 'electron'
import {
  probeContainerRuntime,
  startContainerRuntime
} from '../container-runtime/orbstack-engine-readiness'

export function registerContainerRuntimeHandlers(): void {
  ipcMain.handle('containerRuntime:probe', () => probeContainerRuntime())
  ipcMain.handle('containerRuntime:start', () => startContainerRuntime())
}
