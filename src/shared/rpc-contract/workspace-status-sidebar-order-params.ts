import { z } from 'zod'

export const WorkspaceStatusSidebarOrderParam = z
  .object({
    sections: z.array(z.string()),
    manualLaneSections: z.array(z.string())
  })
  .strict()
