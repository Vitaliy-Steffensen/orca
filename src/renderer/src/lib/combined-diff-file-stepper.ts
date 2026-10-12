export type CombinedDiffFileStepper = (direction: 'next' | 'previous') => boolean

const steppers = new Set<CombinedDiffFileStepper>()

// Fork: a combined diff that is the active tab takes the next/previous-file step itself, putting
// that file's header at the top, rather than the step opening the file in its own tab.
export function registerCombinedDiffFileStepper(stepper: CombinedDiffFileStepper): () => void {
  steppers.add(stepper)
  return () => {
    steppers.delete(stepper)
  }
}

export function stepCombinedDiffFile(direction: 'next' | 'previous'): boolean {
  for (const stepper of steppers) {
    if (stepper(direction)) {
      return true
    }
  }
  return false
}
