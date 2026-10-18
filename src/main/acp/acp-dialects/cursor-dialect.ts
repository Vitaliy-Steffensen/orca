import type { AcpDialect } from './acp-dialect'
import { cursorRequest } from './cursor-requests'

/** Cursor's extra ACP calls. Standard turns, tools and permission requests stay on the shared path. */
export const CURSOR_ACP_DIALECT: AcpDialect = {
  // These two calls omit sessionId. A wrong session id is still refused.
  sessionlessRequests: ['cursor/ask_question', 'cursor/create_plan'],
  request: cursorRequest,
  authenticationRequired: (error) => /authentication required|not logged in/i.test(error.message)
}
