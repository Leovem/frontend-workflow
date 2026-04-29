export interface CreateWorkflowProcessRequest {
  name: string;
  description?: string;
}

export interface WorkflowProcessEditorResponse {
  processId: string;
  processVersionId: string;
  name: string;
  description?: string;
  versionNumber: number;
  versionStatus: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | string;
  graphJson?: unknown;
}

export interface SaveWorkflowProcessVersionRequest {
  graphJson: unknown;
}

export interface WorkflowProcessVersionResponse {
  id: string;
  processId: string;
  versionNumber: number;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | string;
  graphJson?: unknown;
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string;
}