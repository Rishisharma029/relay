/**
 * Database Entity Schema: tool_executions
 */

export interface ToolExecutionEntity {
  id: string
  caseId: string
  toolName: string
  parameters: Record<string, any>
  result: Record<string, any>
  status: 'SUCCESS' | 'FAILED' | 'TIMEOUT'
  durationMs: number
  createdAt: string
}
