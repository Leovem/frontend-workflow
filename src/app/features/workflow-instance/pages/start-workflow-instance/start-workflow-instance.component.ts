import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize, timeout } from 'rxjs';

import {
  StartWorkflowInstanceResponse
} from '../../models/workflow-instance.model';
import {
  WorkflowInstanceApiService
} from '../../../../core/services/workflow-instance-api.service';

@Component({
  selector: 'app-start-workflow-instance',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './start-workflow-instance.component.html',
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      min-height: 0;
    }
  `]
})
export class StartWorkflowInstanceComponent {
  processId = '';
  processVersionId = '';
  title = '';

  applicantName = '';
  requestType = '';
  notes = '';

  loading = false;
  errorMessage = '';
  successMessage = '';

  createdInstance: StartWorkflowInstanceResponse | null = null;

  constructor(
    private readonly workflowInstanceApi: WorkflowInstanceApiService
  ) {}

  startInstance(): void {
    if (this.loading) {
      return;
    }

    const processId = this.processId.trim();
    const processVersionId = this.processVersionId.trim();
    const title = this.title.trim();

    this.errorMessage = '';
    this.successMessage = '';

    if (!processId) {
      this.errorMessage = 'Ingresa el processId del proceso.';
      return;
    }

    if (!processVersionId) {
      this.errorMessage = 'Ingresa el processVersionId publicado.';
      return;
    }

    if (!title) {
      this.errorMessage = 'Ingresa un título para el trámite.';
      return;
    }

    this.loading = true;
    this.createdInstance = null;

    this.workflowInstanceApi.startInstance({
      processId,
      processVersionId,
      title,
      initialData: this.buildInitialData()
    }).pipe(
      timeout(30000),
      finalize(() => {
        this.loading = false;
      })
    ).subscribe({
      next: (response) => {
        console.log('Trámite creado desde Angular:', response);

        this.createdInstance = {
          ...response,
          tasks: response.tasks ?? []
        };

        this.successMessage =
          `Trámite iniciado correctamente: ${response.trackingCode}`;
      },
      error: (error) => {
        console.error('Error al iniciar trámite:', error);
        this.errorMessage = this.extractErrorMessage(error);
      }
    });
  }

  private buildInitialData(): Record<string, unknown> {
    const data: Record<string, unknown> = {};

    const applicantName = this.applicantName.trim();
    const requestType = this.requestType.trim();
    const notes = this.notes.trim();

    if (applicantName) {
      data['solicitante'] = applicantName;
    }

    if (requestType) {
      data['tipoSolicitud'] = requestType;
    }

    if (notes) {
      data['observacionesIniciales'] = notes;
    }

    return data;
  }

  clearForm(): void {
    if (this.loading) {
      return;
    }

    this.processId = '';
    this.processVersionId = '';
    this.title = '';
    this.applicantName = '';
    this.requestType = '';
    this.notes = '';
    this.errorMessage = '';
    this.successMessage = '';
    this.createdInstance = null;
  }

  private extractErrorMessage(error: unknown): string {
    if (
      typeof error === 'object' &&
      error !== null &&
      'name' in error &&
      (error as { name?: string }).name === 'TimeoutError'
    ) {
      return 'El servidor tardó demasiado en responder. Intenta nuevamente en unos segundos.';
    }

    if (
      typeof error === 'object' &&
      error !== null &&
      'status' in error
    ) {
      const httpError = error as {
        status?: number;
        error?: {
          message?: string;
          detail?: string;
          error?: string;
        } | string;
        message?: string;
      };

      if (httpError.status === 0) {
        return 'No se pudo conectar con el backend. Verifica que el servicio esté activo.';
      }

      if (httpError.status === 401 || httpError.status === 403) {
        return 'No tienes autorización para iniciar este trámite.';
      }

      if (httpError.status === 400 || httpError.status === 500) {
        if (typeof httpError.error === 'string') {
          return httpError.error;
        }

        if (httpError.error?.detail) {
          return httpError.error.detail;
        }

        if (httpError.error?.message) {
          return httpError.error.message;
        }

        if (httpError.error?.error) {
          return httpError.error.error;
        }
      }

      if (httpError.message) {
        return httpError.message;
      }
    }

    return 'No se pudo iniciar el trámite. Verifica que la versión esté publicada y que el diagrama tenga nodo inicial.';
  }
}