import { CommonModule } from '@angular/common';
import { Component, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  WorkflowMonitorResponse,
  WorkflowMonitorTask
} from '../../models/workflow-monitor.model';
import { WorkflowMonitorApiService } from '../../../../core/services/workflow-monitor-api.service';

@Component({
  selector: 'app-workflow-monitor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './workflow-monitor.component.html',
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      min-height: 0;
    }
  `]
})
export class WorkflowMonitorComponent implements OnDestroy {
  processVersionId = '';

  monitor: WorkflowMonitorResponse | null = null;

  loading = false;
  errorMessage = '';
  successMessage = '';

  autoRefreshEnabled = false;
  private autoRefreshId: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly workflowMonitorApi: WorkflowMonitorApiService
  ) {}

  ngOnDestroy(): void {
    this.stopAutoRefresh();
  }

  get hasMonitor(): boolean {
    return !!this.monitor;
  }

  get tasks(): WorkflowMonitorTask[] {
    return this.monitor?.tasks ?? [];
  }

  get newTasks(): WorkflowMonitorTask[] {
    return this.tasks.filter(task => task.status === 'NEW');
  }

  get inProgressTasks(): WorkflowMonitorTask[] {
    return this.tasks.filter(task => task.status === 'IN_PROGRESS');
  }

  get completedTasks(): WorkflowMonitorTask[] {
    return this.tasks.filter(task => task.status === 'COMPLETED');
  }

  loadMonitor(showSuccess = true): void {
    const versionId = this.processVersionId.trim();

    if (!versionId) {
      this.errorMessage = 'Ingresa un processVersionId para consultar el monitor.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.workflowMonitorApi.getByProcessVersion(versionId).subscribe({
      next: (response) => {
        this.monitor = response;

        if (showSuccess) {
          this.successMessage = `Monitor actualizado: ${new Date().toLocaleTimeString()}`;
        }
      },
      error: (error) => {
        console.error('Error al cargar monitor:', error);
        this.errorMessage = 'No se pudo cargar el monitor del workflow.';
        this.stopAutoRefresh();
      },
      complete: () => {
        this.loading = false;
      }
    });
  }

  refresh(): void {
    this.loadMonitor(true);
  }

  toggleAutoRefresh(): void {
    if (this.autoRefreshEnabled) {
      this.stopAutoRefresh();
      return;
    }

    const versionId = this.processVersionId.trim();

    if (!versionId) {
      this.errorMessage = 'Ingresa un processVersionId antes de activar la actualización automática.';
      return;
    }

    this.autoRefreshEnabled = true;
    this.successMessage = 'Actualización automática activada.';

    this.loadMonitor(false);

    this.autoRefreshId = setInterval(() => {
      this.loadMonitor(false);
    }, 5000);
  }

  private stopAutoRefresh(): void {
    this.autoRefreshEnabled = false;

    if (this.autoRefreshId) {
      clearInterval(this.autoRefreshId);
      this.autoRefreshId = null;
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'NEW':
        return 'Recién llegada';
      case 'IN_PROGRESS':
        return 'En proceso';
      case 'COMPLETED':
        return 'Terminada';
      case 'CANCELLED':
        return 'Cancelada';
      case 'REJECTED':
        return 'Rechazada';
      case 'RETURNED':
        return 'Devuelta';
      default:
        return status;
    }
  }

  getStatusClasses(status: string): string {
    switch (status) {
      case 'NEW':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'IN_PROGRESS':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'COMPLETED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'CANCELLED':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  }

  getTimelineDotClasses(status: string): string {
    switch (status) {
      case 'NEW':
        return 'bg-rose-500 shadow-rose-200';
      case 'IN_PROGRESS':
        return 'bg-amber-500 shadow-amber-200';
      case 'COMPLETED':
        return 'bg-emerald-500 shadow-emerald-200';
      default:
        return 'bg-slate-400 shadow-slate-200';
    }
  }

  formatDate(value?: string): string {
    if (!value) {
      return '—';
    }

    return new Date(value).toLocaleString();
  }

  trackTaskById(index: number, task: WorkflowMonitorTask): string {
    return task.taskId;
  }
}