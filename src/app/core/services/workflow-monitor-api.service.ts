import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { WorkflowMonitorResponse } from '../../features/workflow-monitor/models/workflow-monitor.model';
import { API_ENDPOINTS } from '../config/api-endpoints';

@Injectable({
  providedIn: 'root'
})
export class WorkflowMonitorApiService {
  private readonly apiUrl = API_ENDPOINTS.workflowMonitor;

  constructor(private readonly http: HttpClient) {}

  getByProcessVersion(processVersionId: string): Observable<WorkflowMonitorResponse> {
    return this.http.get<WorkflowMonitorResponse>(
      `${this.apiUrl}/process-version/${processVersionId}`
    );
  }
}