import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  CreateWorkflowProcessRequest,
  SaveWorkflowProcessVersionRequest,
  WorkflowProcessEditorResponse,
  WorkflowProcessVersionResponse
} from '../../features/process-editor/models/workflow-process.model';

import { API_ENDPOINTS } from '../config/api-endpoints';

@Injectable({
  providedIn: 'root'
})
export class WorkflowProcessApiService {
  private readonly apiUrl = API_ENDPOINTS.workflowProcesses;

  constructor(private readonly http: HttpClient) {}

  createProcess(
    request: CreateWorkflowProcessRequest
  ): Observable<WorkflowProcessEditorResponse> {
    return this.http.post<WorkflowProcessEditorResponse>(
      this.apiUrl,
      request
    );
  }

  findEditorData(processId: string): Observable<WorkflowProcessEditorResponse> {
    return this.http.get<WorkflowProcessEditorResponse>(
      `${this.apiUrl}/${processId}/editor`
    );
  }

  saveDraftVersion(
    processVersionId: string,
    request: SaveWorkflowProcessVersionRequest
  ): Observable<WorkflowProcessVersionResponse> {
    return this.http.put<WorkflowProcessVersionResponse>(
      `${this.apiUrl}/versions/${processVersionId}/draft`,
      request
    );
  }

  publishVersion(
    processVersionId: string
  ): Observable<WorkflowProcessVersionResponse> {
    return this.http.post<WorkflowProcessVersionResponse>(
      `${this.apiUrl}/versions/${processVersionId}/publish`,
      {}
    );
  }
}