import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

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
    const processId = this.processId.trim();
    const processVersionId = this.processVersionId.trim();
    const title = this.title.trim();

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
    this.errorMessage = '';
    this.successMessage = '';
    this.createdInstance = null;

    this.workflowInstanceApi.startInstance({
      processId,
      processVersionId,
      title,
      initialData: this.buildInitialData()
    }).subscribe({
      next: (response) => {
        this.createdInstance = response;
        this.successMessage = `Trámite iniciado correctamente: ${response.trackingCode}`;
      },
      error: (error) => {
        console.error('Error al iniciar trámite:', error);
        this.errorMessage = this.extractErrorMessage(error);
      },
      complete: () => {
        this.loading = false;
      }
    });
  }

  private buildInitialData(): Record<string, unknown> {
    const data: Record<string, unknown> = {};

    if (this.applicantName.trim()) {
      data['solicitante'] = this.applicantName.trim();
    }

    if (this.requestType.trim()) {
      data['tipoSolicitud'] = this.requestType.trim();
    }

    if (this.notes.trim()) {
      data['observacionesIniciales'] = this.notes.trim();
    }

    return data;
  }

  clearForm(): void {
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
      'error' in error
    ) {
      const httpError = error as { error?: { message?: string; detail?: string } | string };

      if (typeof httpError.error === 'string') {
        return httpError.error;
      }

      if (httpError.error?.message) {
        return httpError.error.message;
      }

      if (httpError.error?.detail) {
        return httpError.error.detail;
      }
    }

    return 'No se pudo iniciar el trámite. Verifica que la versión esté publicada.';
  }
}