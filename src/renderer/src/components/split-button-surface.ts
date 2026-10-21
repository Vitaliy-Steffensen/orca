// Why shared: the tab-bar quick commands button and the workspace action buttons sit in the same
// header row, so a divided button has to read as one control in both places.
export const SPLIT_BUTTON_SURFACE_CLASS =
  'my-auto flex h-7 shrink-0 items-stretch overflow-hidden rounded-md border border-border/60 text-muted-foreground'

export const SPLIT_BUTTON_SEGMENT_CLASS =
  'flex items-center bg-transparent leading-none text-muted-foreground hover:bg-accent/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50'

/** The leading segment: the verb itself. */
export const SPLIT_BUTTON_MAIN_SEGMENT_CLASS = 'gap-1.5 rounded-l-md rounded-r-none px-1.5'

/** The trailing chevron segment that opens the alternatives. */
export const SPLIT_BUTTON_MENU_SEGMENT_CLASS =
  'justify-center rounded-l-none rounded-r-md border-l border-border/60 px-1'

/** A segment that follows another one inside the same surface, so it needs its own divider. */
export const SPLIT_BUTTON_FOLLOWING_SEGMENT_CLASS = 'rounded-l-none border-l border-border/60'
