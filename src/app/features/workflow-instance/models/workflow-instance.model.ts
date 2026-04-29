import { WorkflowTask } from '../../process-editor/models/workflow-task.model';

export interface StartWorkflowInstanceRequest {
  processId: string;
  processVersionId: string;
  title: string;
  initialData?: Record<string, unknown>;
}

export interface StartWorkflowInstanceResponse {
  id: string;
  trackingCode: string;

  processId: string;
  processVersionId: string;

  title: string;
  status: string;
  currentNodeId?: string | null;

  createdAt?: string;

  tasks: WorkflowTask[];
}