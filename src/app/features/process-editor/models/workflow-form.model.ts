export type WorkflowFormFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'select'
  | 'checkbox'
  | 'file'
  | 'image';

export interface AIGeneratedWorkflowFormsResponse {
  forms: AIGeneratedWorkflowForm[];
}

export interface AIGeneratedWorkflowForm {
  nodeId: string;
  title: string;
  description?: string;
  fields: AIGeneratedWorkflowFormField[];
}

export interface AIGeneratedWorkflowFormField {
  label: string;
  type: WorkflowFormFieldType;
  required: boolean;
  placeholder?: string | null;
  options?: string[];
}

export interface WorkflowFormDefinition {
  id: string;
  processId: string;
  processVersionId: string;
  nodeId: string;
  title: string;
  description?: string;
  generatedByAI: boolean;
  fields: WorkflowFormField[];
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkflowFormField {
  id: string;
  label: string;
  type: WorkflowFormFieldType;
  required: boolean;
  placeholder?: string | null;
  options?: string[];
  order: number;
}

export interface SaveBulkWorkflowFormsRequest {
  processId: string;
  processVersionId: string;
  forms: SaveWorkflowFormRequest[];
}

export interface SaveWorkflowFormRequest {
  nodeId: string;
  title: string;
  description?: string;
  generatedByAI: boolean;
  fields: SaveWorkflowFormFieldRequest[];
}

export interface SaveWorkflowFormFieldRequest {
  label: string;
  type: WorkflowFormFieldType;
  required: boolean;
  placeholder?: string | null;
  options?: string[];
  order: number;
}

export interface UpdateWorkflowFormRequest {
  title: string;
  description?: string;
  generatedByAI: boolean;
  fields: UpdateWorkflowFormFieldRequest[];
}

export interface UpdateWorkflowFormFieldRequest {
  id?: string;
  label: string;
  type: WorkflowFormFieldType;
  required: boolean;
  placeholder?: string | null;
  options?: string[];
  order: number;
}