export type DiagramIssueSeverity = 'error' | 'warning';

export interface DiagramValidationIssue {
  id?: string;
  severity: DiagramIssueSeverity;
  code: string;
  message: string;
  cellId?: string;
  nodeLabel?: string;
}