/** Whether a local container engine (OrbStack's Docker socket) is answering. */
export type ContainerRuntimeStatus = 'ready' | 'stopped' | 'unavailable'

export type ContainerRuntimeStartResult = 'ready' | 'unavailable' | 'timed-out'
