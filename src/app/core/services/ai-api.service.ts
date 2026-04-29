import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_ENDPOINTS } from '../config/api-endpoints';

import {
  DiagramAiResponse,
  DiagramAnalyzeRequest,
  DiagramInstructionRequest,
  DiagramNormalizeRequest
} from '../../features/process-editor/models/ai-diagram.models';

@Injectable({
  providedIn: 'root'
})
export class AiApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = API_ENDPOINTS.aiDiagram;

  instruct(payload: DiagramInstructionRequest): Observable<DiagramAiResponse> {
    return this.http.post<DiagramAiResponse>(
      `${this.baseUrl}/instruct`,
      payload
    );
  }

  normalize(payload: DiagramNormalizeRequest): Observable<DiagramAiResponse> {
    return this.http.post<DiagramAiResponse>(
      `${this.baseUrl}/normalize`,
      payload
    );
  }

  analyze(payload: DiagramAnalyzeRequest): Observable<DiagramAiResponse> {
    return this.http.post<DiagramAiResponse>(
      `${this.baseUrl}/analyze`,
      payload
    );
  }
}