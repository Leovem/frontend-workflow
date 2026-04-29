import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  AIGeneratedWorkflowFormsResponse
} from '../../features/process-editor/models/workflow-form.model';

import { API_ENDPOINTS } from '../config/api-endpoints';

@Injectable({
  providedIn: 'root'
})
export class WorkflowAiApiService {
  private readonly apiUrl = API_ENDPOINTS.aiWorkflow;

  constructor(private readonly http: HttpClient) {}

  generateForms(context: unknown): Observable<AIGeneratedWorkflowFormsResponse> {
    return this.http.post<AIGeneratedWorkflowFormsResponse>(
      `${this.apiUrl}/forms/generate`,
      { context }
    );
  }
}