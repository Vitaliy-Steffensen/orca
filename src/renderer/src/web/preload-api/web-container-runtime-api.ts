import type { ContainerRuntimeApi } from '../../../../preload/api/container-runtime-api'

export function createWebContainerRuntimeApi(): ContainerRuntimeApi {
  return {
    probe: async () => 'unavailable',
    start: async () => 'unavailable'
  }
}
