import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_ENDPOINTS } from '../config/api-endpoints';

export interface WorkflowProject {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  collaborationRoomId: string;
  accessCode: string;
  memberUserIds: string[];
  diagramSnapshot: any;
}

@Injectable({
  providedIn: 'root'
})
export class WorkflowProjectService {
  private readonly baseUrl = API_ENDPOINTS.workflowProjects;

  constructor(private readonly http: HttpClient) {}

  getMyProjects(): Observable<WorkflowProject[]> {
    return this.http.get<WorkflowProject[]>(`${this.baseUrl}/my`);
  }

  create(data: { name: string; description: string }): Observable<WorkflowProject> {
    return this.http.post<WorkflowProject>(this.baseUrl, data);
  }

  joinByCode(accessCode: string): Observable<WorkflowProject> {
    return this.http.post<WorkflowProject>(`${this.baseUrl}/join`, {
      accessCode
    });
  }

  findById(id: string): Observable<WorkflowProject> {
    return this.http.get<WorkflowProject>(`${this.baseUrl}/${id}`);
  }

  updateSnapshot(id: string, diagramSnapshot: any): Observable<WorkflowProject> {
    return this.http.put<WorkflowProject>(`${this.baseUrl}/${id}/snapshot`, {
      diagramSnapshot
    });
  }
}