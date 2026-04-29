// src/app/core/config/api-endpoints.ts

import { environment } from '../../../environments/environment.prod';

export const API_ENDPOINTS = {
  auth: `${environment.api.springBoot}/auth`,
  users: `${environment.api.springBoot}/users`,

  workflowProjects: `${environment.api.springBoot}/workflow-projects`,
  workflowProcesses: `${environment.api.springBoot}/workflow-processes`,
  workflowForms: `${environment.api.springBoot}/workflow-forms`,
  workflowFormSubmissions: `${environment.api.springBoot}/workflow-form-submissions`,
  workflowInstances: `${environment.api.springBoot}/workflow-instances`,
  workflowMonitor: `${environment.api.springBoot}/workflow-monitor`,
  workflowTasks: `${environment.api.springBoot}/workflow-tasks`,

  aiDiagram: `${environment.api.fastApi}/ai/diagram`,
  aiWorkflow: `${environment.api.fastApi}/ai/workflow`,

  collaboration: `${environment.api.node}/collaboration`
};