import { existsSync } from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { runProcess } from '@orca/process-host'
import type {
  ContainerRuntimeStartResult,
  ContainerRuntimeStatus
} from '../../shared/container-runtime-status'

const PING_TIMEOUT_MS = 1_500
const POLL_INTERVAL_MS = 1_000
const START_TIMEOUT_MS = 120_000

function dockerSocketPaths(): string[] {
  const host = process.env.DOCKER_HOST
  const configured = host?.startsWith('unix://') ? [host.slice('unix://'.length)] : []
  return [
    ...configured,
    path.join(os.homedir(), '.orbstack', 'run', 'docker.sock'),
    '/var/run/docker.sock'
  ]
}

function pingDockerSocket(socketPath: string): Promise<boolean> {
  if (!existsSync(socketPath)) {
    return Promise.resolve(false)
  }
  return new Promise((resolve) => {
    const request = http.request(
      { socketPath, path: '/_ping', method: 'GET', timeout: PING_TIMEOUT_MS },
      (response) => {
        response.resume()
        resolve(response.statusCode === 200)
      }
    )
    request.on('error', () => resolve(false))
    request.on('timeout', () => {
      request.destroy()
      resolve(false)
    })
    request.end()
  })
}

async function engineResponds(): Promise<boolean> {
  for (const socketPath of dockerSocketPaths()) {
    if (await pingDockerSocket(socketPath)) {
      return true
    }
  }
  return false
}

function orbstackInstalled(): boolean {
  return (
    existsSync('/Applications/OrbStack.app') ||
    existsSync(path.join(os.homedir(), 'Applications', 'OrbStack.app'))
  )
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

/** 'stopped' only when OrbStack is installed, so a host without it never promises a start. */
export async function probeContainerRuntime(): Promise<ContainerRuntimeStatus> {
  if (process.platform !== 'darwin') {
    return 'unavailable'
  }
  if (await engineResponds()) {
    return 'ready'
  }
  return orbstackInstalled() ? 'stopped' : 'unavailable'
}

export async function startContainerRuntime(): Promise<ContainerRuntimeStartResult> {
  const status = await probeContainerRuntime()
  if (status !== 'stopped') {
    return status === 'ready' ? 'ready' : 'unavailable'
  }
  // -g keeps OrbStack behind Orca instead of stealing the user's focus mid-run.
  const launched = await runProcess({
    program: '/usr/bin/open',
    args: ['-ga', 'OrbStack'],
    timeoutMs: 15_000,
    maxOutputBytes: 64 * 1024
  }).catch(() => null)
  if (!launched || launched.code !== 0) {
    return 'unavailable'
  }
  const deadline = Date.now() + START_TIMEOUT_MS
  while (Date.now() < deadline) {
    await delay(POLL_INTERVAL_MS)
    if (await engineResponds()) {
      return 'ready'
    }
  }
  return 'timed-out'
}
