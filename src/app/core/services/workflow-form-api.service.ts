import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  SaveBulkWorkflowFormsRequest,
  UpdateWorkflowFormRequest,
  WorkflowFormDefinition
} from '../../features/process-editor/models/workflow-form.model';

import { API_ENDPOINTS } from '../config/api-endpoints';

@Injectable({
  providedIn: 'root'
})
export class WorkflowFormApiService {
  private readonly apiUrl = API_ENDPOINTS.workflowForms;

  constructor(private readonly http: HttpClient) {}

  saveBulk(
    request: SaveBulkWorkflowFormsRequest
  ): Observable<WorkflowFormDefinition[]> {
    return this.http.post<WorkflowFormDefinition[]>(
      `${this.apiUrl}/bulk`,
      request
    );
  }

  findByProcessVersion(
    processVersionId: string
  ): Observable<WorkflowFormDefinition[]> {
    return this.http.get<WorkflowFormDefinition[]>(
      `${this.apiUrl}/process-version/${processVersionId}`
    );
  }

  findById(formId: string): Observable<WorkflowFormDefinition> {
    return this.http.get<WorkflowFormDefinition>(
      `${this.apiUrl}/${formId}`
    );
  }

  updateForm(
    formId: string,
    request: UpdateWorkflowFormRequest
  ): Observable<WorkflowFormDefinition> {
    return this.http.put<WorkflowFormDefinition>(
      `${this.apiUrl}/${formId}`,
      request
    );
  }
}