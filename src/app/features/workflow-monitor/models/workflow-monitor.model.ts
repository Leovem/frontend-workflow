export type WorkflowMonitorTaskStatus =
  | 'NEW'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REJECTED'
  | 'RETURNED'
  | string;

export interface WorkflowMonitorTask {
  taskId: string;
  instanceId: string;
  processId: string;
  processVersionId: string;

  nodeId: string;
  nodeLabel: string;

  departmentId?: string;
  departmentName?: string;

  assignedUserId?: string;

  status: WorkflowMonitorTaskStatus;

  createdAt?: string;
  claimedAt?: string;
  completedAt?: string;
  updatedAt?: string;
}

export interface WorkflowMonitorResponse {
  processVersionId: string;

  totalTasks: number;
  newTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  cancelledTasks: number;

  generatedAt: string;

  tasks: WorkflowMonitorTask[];
}