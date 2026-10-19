// Why: Electron drag hit-testing is class-based and ignores z-index. Keep the
// stretchy activity strip draggable while opting only real controls out.
export const RIGHT_SIDEBAR_HEADER_NO_DRAG_CLASS_NAME = 'right-sidebar-header-no-drag'

// Why its own row: the tabs no longer compete with the action buttons for the titlebar's
// width, so every panel stays one click away instead of sliding behind a More menu.
export const RIGHT_SIDEBAR_TOP_ACTIVITY_STRIP_CLASS_NAME =
  'right-sidebar-activity-strip flex h-[36px] min-h-[36px] min-w-0 items-center overflow-hidden border-b border-border pl-1'
