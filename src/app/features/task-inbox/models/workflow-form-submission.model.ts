export interface SaveWorkflowFormSubmissionRequest {
  taskId: string;
  userId: string;
  values: Record<string, unknown>;
}

export interface WorkflowFormSubmission {
  id: string;

  taskId: string;
  instanceId: string;
  processId: string;
  processVersionId: string;

  nodeId: string;
  formId: string;

  submittedByUserId: string;

  values: Record<string, unknown>;

  submittedAt?: string;
  updatedAt?: string;
}