import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  StartWorkflowInstanceRequest,
  StartWorkflowInstanceResponse
} from '../../features/workflow-instance/models/workflow-instance.model';

import { API_ENDPOINTS } from '../config/api-endpoints';

@Injectable({
  providedIn: 'root'
})
export class WorkflowInstanceApiService {
  private readonly apiUrl = API_ENDPOINTS.workflowInstances;

  constructor(private readonly http: HttpClient) {}

  startInstance(
    request: StartWorkflowInstanceRequest
  ): Observable<StartWorkflowInstanceResponse> {
    return this.http.post<StartWorkflowInstanceResponse>(
      `${this.apiUrl}/start`,
      request
    );
  }
}