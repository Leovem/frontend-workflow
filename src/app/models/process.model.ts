export interface WorkflowProcess {
  id?: string;
  name: string;
  description: string;
  diagramData: any;    
  createdBy: string;
  updatedAt: Date;
  version: number;
}