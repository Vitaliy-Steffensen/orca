import { app, BrowserWindow, nativeTheme, type Event } from 'electron'
import type { Store } from '../persistence'
import type { OrcaRuntimeRpcServer } from '../runtime/runtime-rpc'
import { isBackgroundLaunch, showWindowWithoutStealingFocus } from './foreground-activation-policy'
import { installPrivilegedWindowNavigationPolicy } from './privileged-window-navigation'
import { rectHasVisibleAreaOnAnyDisplay } from './window-bounds-validation'

const MIN_WIDTH = 640
const MIN_HEIGHT = 420
const DEFAULT_WIDTH = 1280
const DEFAULT_HEIGHT = 800
// Why: persisted so the paired credential and device key survive restarts; a fresh partition would mint a new device every open.
const COMPANION_PARTITION = 'persist:orca-companion'
// Why: must match ENVIRONMENT_STORAGE_KEY in the web client; it is how we tell a paired window from a first run.
const WEB_ENVIRONMENT_STORAGE_KEY = 'orca.web.runtimeEnvironment.v1'
const LOOPBACK_ADDRESS = '127.0.0.1'

let companionWindow: BrowserWindow | null = null

function resolveRestoredBounds(
  store: Store | null
): { x: number; y: number; width: number; height: number } | null {
  const raw = store?.getUI().companionWindowBounds ?? null
  if (
    raw &&
    raw.width >= MIN_WIDTH &&
    raw.height >= MIN_HEIGHT &&
    rectHasVisibleAreaOnAnyDisplay(raw, MIN_WIDTH / 2, MIN_HEIGHT / 2)
  ) {
    return raw
  }
  return null
}

function mintLoopbackPairingUrl(rpcServer: OrcaRuntimeRpcServer): string | null {
  const offer = rpcServer.createPairingOffer({
    address: LOOPBACK_ADDRESS,
    name: 'Companion window',
    scope: 'runtime',
    // Why: a loopback-only grant must never make a later launch bind every interface.
    reach: 'this-computer'
  })
  return offer.available ? offer.webClientUrl : null
}

async function loadCompanionClient(
  window: BrowserWindow,
  rpcServer: OrcaRuntimeRpcServer
): Promise<void> {
  // Why: the web client is served by the runtime over loopback; the pairing URL carries its origin.
  const pairingUrl = mintLoopbackPairingUrl(rpcServer)
  if (!pairingUrl) {
    console.warn('[companion-window] Web client unavailable; run `pnpm run build:web`.')
    window.close()
    return
  }
  const clientUrl = new URL(pairingUrl)
  const plainUrl = `${clientUrl.origin}${clientUrl.pathname}`
  await window.loadURL(plainUrl)
  const alreadyPaired = await window.webContents.executeJavaScript(
    `localStorage.getItem(${JSON.stringify(WEB_ENVIRONMENT_STORAGE_KEY)}) !== null`
  )
  if (alreadyPaired !== true && !window.isDestroyed()) {
    await window.loadURL(pairingUrl)
    // Why: adding only a hash is a same-document navigation, so the already-rendered connect screen would never read the offer.
    window.webContents.reload()
  }
}

export function createOrFocusCompanionWindow(
  store: Store | null,
  rpcServer: OrcaRuntimeRpcServer
): BrowserWindow {
  if (companionWindow && !companionWindow.isDestroyed()) {
    if (companionWindow.isMinimized()) {
      companionWindow.restore()
    }
    if (!isBackgroundLaunch()) {
      companionWindow.focus()
    }
    return companionWindow
  }

  const savedBounds = resolveRestoredBounds(store)
  const window = new BrowserWindow({
    width: savedBounds?.width ?? DEFAULT_WIDTH,
    height: savedBounds?.height ?? DEFAULT_HEIGHT,
    ...(savedBounds ? { x: savedBounds.x, y: savedBounds.y } : {}),
    minWidth: MIN_WIDTH,
    minHeight: MIN_HEIGHT,
    title: 'Orca',
    show: false,
    autoHideMenuBar: true,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#0a0a0a' : '#ffffff',
    // Why: native frame keeps the window movable on every platform without the main window's custom titlebar chrome.
    webPreferences: {
      // Why: no preload — this is the browser web client, so it gets none of the desktop renderer's privileged IPC.
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      partition: COMPANION_PARTITION,
      webviewTag: false
    }
  })
  installPrivilegedWindowNavigationPolicy(window.webContents)
  window.webContents.session.setPermissionRequestHandler((_webContents, _permission, callback) =>
    callback(false)
  )
  window.webContents.session.setPermissionCheckHandler(() => false)
  companionWindow = window

  window.once('ready-to-show', () => showWindowWithoutStealingFocus(window))

  let boundsTimer: ReturnType<typeof setTimeout> | null = null
  let windowClosing = false
  const saveBounds = (): void => {
    if (boundsTimer) {
      clearTimeout(boundsTimer)
    }
    boundsTimer = setTimeout(() => {
      boundsTimer = null
      if (windowClosing || window.isDestroyed() || window.isMinimized() || window.isFullScreen()) {
        return
      }
      const bounds = window.getBounds()
      if (bounds.width >= MIN_WIDTH && bounds.height >= MIN_HEIGHT) {
        store?.updateUI({ companionWindowBounds: bounds })
      }
    }, 500)
  }
  window.on('resize', saveBounds)
  window.on('move', saveBounds)

  const freezeBounds = (event?: Event): void => {
    if (event?.defaultPrevented) {
      return
    }
    windowClosing = true
    if (boundsTimer) {
      clearTimeout(boundsTimer)
      boundsTimer = null
    }
  }
  window.on('close', freezeBounds)
  app.on('before-quit', freezeBounds)
  window.on('closed', () => {
    app.removeListener('before-quit', freezeBounds)
    if (companionWindow === window) {
      companionWindow = null
    }
  })

  void loadCompanionClient(window, rpcServer).catch((error: unknown) => {
    console.error('[companion-window] Failed to load web client:', error)
  })
  return window
}

export function closeCompanionWindow(): void {
  if (companionWindow && !companionWindow.isDestroyed()) {
    companionWindow.close()
  }
  companionWindow = null
}
