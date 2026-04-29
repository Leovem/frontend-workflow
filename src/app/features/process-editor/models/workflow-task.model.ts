export type WorkflowTaskStatus =
  | 'NEW'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'REJECTED'
  | 'RETURNED'
  | 'CANCELLED'
  | string;

export interface WorkflowTask {
  id: string;

  instanceId: string;
  processId: string;
  processVersionId: string;

  nodeId: string;
  nodeLabel: string;

  departmentId?: string;
  departmentName?: string;

  roleId?: string;
  assignedUserId?: string;

  formId?: string;

  status: WorkflowTaskStatus;

  createdAt?: string;
  claimedAt?: string;
  completedAt?: string;
  updatedAt?: string;
}