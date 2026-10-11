export type TrackedModelFile = { worktreeId: string; relativePath: string }

type Disposable = { dispose: () => void }
type TrackableEditor = {
  getModel: () => { uri: { toString: () => string } } | null
  onDidChangeModel: (listener: () => void) => Disposable
  onDidDispose: (listener: () => void) => Disposable
}
type Registration = { file: TrackedModelFile; modifiedSide: boolean }

// Why: Monaco models are named by whoever creates them (a tab by its path, a diff side by an
// internal diff path, a Peek copy by a preview scheme), so each registers the worktree file it
// shows here and language servers, blame and navigation read every kind the same way.
const registrations = new Map<string, Registration>()

export function trackModelFile(
  uri: string,
  file: TrackedModelFile,
  { modifiedSide = false }: { modifiedSide?: boolean } = {}
): () => void {
  const registration: Registration = { file, modifiedSide }
  registrations.set(uri, registration)
  return () => {
    if (registrations.get(uri) === registration) {
      registrations.delete(uri)
    }
  }
}

export function trackDiffEditorFile(
  diffEditor: {
    getOriginalEditor: () => TrackableEditor
    getModifiedEditor: () => TrackableEditor
  },
  file: TrackedModelFile
): void {
  const modifiedSide = diffEditor.getModifiedEditor()
  const sides = [diffEditor.getOriginalEditor(), modifiedSide]
  const releases = new Map<TrackableEditor, () => void>()
  const track = (side: TrackableEditor): void => {
    releases.get(side)?.()
    releases.delete(side)
    const uri = side.getModel()?.uri.toString()
    if (uri) {
      releases.set(side, trackModelFile(uri, file, { modifiedSide: side === modifiedSide }))
    }
  }
  const subscriptions: Disposable[] = []
  for (const side of sides) {
    track(side)
    subscriptions.push(side.onDidChangeModel(() => track(side)))
  }
  const release = (): void => {
    for (const forget of releases.values()) {
      forget()
    }
    releases.clear()
    for (const subscription of subscriptions) {
      subscription.dispose()
    }
  }
  for (const side of sides) {
    side.onDidDispose(release)
  }
}

export function modelFileFor(uri: string): TrackedModelFile | undefined {
  return registrations.get(uri)?.file
}

export function isModifiedDiffSide(uri: string): boolean {
  return registrations.get(uri)?.modifiedSide === true
}
