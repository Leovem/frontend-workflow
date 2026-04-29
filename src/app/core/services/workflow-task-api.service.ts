import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { WorkflowTask } from '../../features/process-editor/models/workflow-task.model';
import { API_ENDPOINTS } from '../config/api-endpoints';

@Injectable({
  providedIn: 'root'
})
export class WorkflowTaskApiService {
  private readonly apiUrl = API_ENDPOINTS.workflowTasks;

  constructor(private readonly http: HttpClient) {}

  findByDepartment(departmentId: string): Observable<WorkflowTask[]> {
    return this.http.get<WorkflowTask[]>(
      `${this.apiUrl}/department/${departmentId}`
    );
  }

  findAssignedToUser(userId: string): Observable<WorkflowTask[]> {
    return this.http.get<WorkflowTask[]>(
      `${this.apiUrl}/assigned/${userId}`
    );
  }

  claimTask(taskId: string, userId: string): Observable<WorkflowTask> {
    return this.http.post<WorkflowTask>(
      `${this.apiUrl}/${taskId}/claim/${userId}`,
      {}
    );
  }

  completeTask(taskId: string, userId: string): Observable<WorkflowTask> {
    return this.http.post<WorkflowTask>(
      `${this.apiUrl}/${taskId}/complete/${userId}`,
      {}
    );
  }
}