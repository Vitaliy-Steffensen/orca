/** The right-sidebar panels that each own an independent content search. */
export const FILE_SEARCH_SCOPE_IDS = ['explorer', 'source-control', 'pr-diff'] as const

export type FileSearchScopeId = (typeof FILE_SEARCH_SCOPE_IDS)[number]
