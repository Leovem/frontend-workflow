import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  SaveWorkflowFormSubmissionRequest,
  WorkflowFormSubmission
} from '../../features/task-inbox/models/workflow-form-submission.model';

import { API_ENDPOINTS } from '../config/api-endpoints';

@Injectable({
  providedIn: 'root'
})
export class WorkflowFormSubmissionApiService {
  private readonly apiUrl = API_ENDPOINTS.workflowFormSubmissions;

  constructor(private readonly http: HttpClient) {}

  saveSubmission(
    request: SaveWorkflowFormSubmissionRequest
  ): Observable<WorkflowFormSubmission> {
    return this.http.post<WorkflowFormSubmission>(
      this.apiUrl,
      request
    );
  }

  findByTaskId(taskId: string): Observable<WorkflowFormSubmission> {
    return this.http.get<WorkflowFormSubmission>(
      `${this.apiUrl}/task/${taskId}`
    );
  }
}