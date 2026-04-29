export type WorkflowValidationSeverity = 'ERROR' | 'WARNING' | 'INFO';

export interface WorkflowValidationIssue {
  id: string;
  severity: WorkflowValidationSeverity;
  code: string;
  message: string;
  cellId?: string;
  nodeLabel?: string;
}