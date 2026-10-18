import type {
  ContainerRuntimeStartResult,
  ContainerRuntimeStatus
} from '../../shared/container-runtime-status'

export type ContainerRuntimeApi = {
  probe: () => Promise<ContainerRuntimeStatus>
  start: () => Promise<ContainerRuntimeStartResult>
}
