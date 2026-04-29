import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize, switchMap } from 'rxjs';

import { WorkflowTask } from '../../../process-editor/models/workflow-task.model';
import { WorkflowFormDefinition } from '../../../process-editor/models/workflow-form.model';

import { WorkflowTaskApiService } from '../../../../core/services/workflow-task-api.service';
import { WorkflowFormApiService } from '../../../../core/services/workflow-form-api.service';
import { WorkflowFormSubmissionApiService } from '../../../../core/services/workflow-form-submission-api.service';

@Component({
    selector: 'app-task-inbox',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './task-inbox.component.html',
    styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      min-height: 0;
    }
  `]
})
export class TaskInboxComponent implements OnInit {
    // Temporales para prueba.
    // Luego vendrán del usuario autenticado/JWT.
    departmentId = '';
    userId = 'user_test_001';

    tasks: WorkflowTask[] = [];

    loading = false;
    claimingTaskId: string | null = null;
    errorMessage = '';
    successMessage = '';

    selectedTask: WorkflowTask | null = null;
    selectedTaskForm: WorkflowFormDefinition | null = null;
    taskFormValues: Record<string, unknown> = {};

    taskFormLoading = false;
    taskFormSaving = false;
    showTaskFormPanel = false;
    completingTaskId: string | null = null;

    constructor(
        private readonly workflowTaskApi: WorkflowTaskApiService,
        private readonly workflowFormApi: WorkflowFormApiService,
        private readonly submissionApi: WorkflowFormSubmissionApiService
    ) { }

    ngOnInit(): void {
        // Para pruebas puedes pegar aquí un departmentId real.
        // this.departmentId = 'dep_recepcion';
        // this.loadTasks();
    }

    get newTasks(): WorkflowTask[] {
        return this.tasks.filter(task => task.status === 'NEW');
    }

    get inProgressTasks(): WorkflowTask[] {
        return this.tasks.filter(task => task.status === 'IN_PROGRESS');
    }

    get completedTasks(): WorkflowTask[] {
        return this.tasks.filter(task => task.status === 'COMPLETED');
    }

    get hasTasks(): boolean {
        return this.tasks.length > 0;
    }

    loadTasks(): void {
        const departmentId = this.departmentId.trim();

        if (!departmentId) {
            this.errorMessage = 'Ingresa un departmentId para consultar tareas.';
            return;
        }

        this.loading = true;
        this.errorMessage = '';
        this.successMessage = '';

        this.workflowTaskApi.findByDepartment(departmentId).pipe(
            finalize(() => {
                this.loading = false;
            })
        ).subscribe({
            next: (tasks) => {
                console.log('Tareas cargadas:', tasks);
                this.tasks = tasks ?? [];
            },
            error: (error) => {
                console.error('Error al cargar tareas:', error);
                this.errorMessage = 'No se pudieron cargar las tareas del departamento.';
            }
        });
    }

    claimTask(task: WorkflowTask): void {
        if (task.status !== 'NEW') {
            return;
        }

        const userId = this.userId.trim();

        if (!userId) {
            this.errorMessage = 'Ingresa un userId para tomar la tarea.';
            return;
        }

        this.claimingTaskId = task.id;
        this.errorMessage = '';
        this.successMessage = '';

        this.workflowTaskApi.claimTask(task.id, userId).pipe(
            finalize(() => {
                this.claimingTaskId = null;
            })
        ).subscribe({
            next: (updatedTask) => {
                this.tasks = this.tasks.map(current =>
                    current.id === updatedTask.id ? updatedTask : current
                );

                this.successMessage = 'Tarea tomada correctamente.';
            },
            error: (error) => {
                console.error('Error al tomar tarea:', error);
                this.errorMessage = 'No se pudo tomar la tarea.';
            }
        });
    }

    refresh(): void {
        this.loadTasks();
    }


    openTaskForm(task: WorkflowTask): void {
        if (!task.formId) {
            this.errorMessage = 'Esta tarea no tiene formulario asociado.';
            return;
        }

        this.selectedTask = task;
        this.selectedTaskForm = null;
        this.taskFormValues = {};
        this.showTaskFormPanel = true;
        this.taskFormLoading = true;
        this.errorMessage = '';
        this.successMessage = '';

        this.workflowFormApi.findById(task.formId).subscribe({
            next: (form) => {
                this.selectedTaskForm = form;
                this.initializeFormValues(form);

                this.submissionApi.findByTaskId(task.id).subscribe({
                    next: (submission) => {
                        this.taskFormValues = {
                            ...this.taskFormValues,
                            ...submission.values
                        };
                    },
                    error: () => {
                        // Si no existe respuesta previa, no pasa nada.
                    }
                });
            },
            error: (error) => {
                console.error('Error al cargar formulario de tarea:', error);
                this.errorMessage = 'No se pudo cargar el formulario de la tarea.';
                this.showTaskFormPanel = false;
            },
            complete: () => {
                this.taskFormLoading = false;
            }
        });
    }

    private initializeFormValues(form: WorkflowFormDefinition): void {
        const values: Record<string, unknown> = {};

        for (const field of form.fields) {
            values[field.id] = field.type === 'checkbox' ? false : '';
        }

        this.taskFormValues = values;
    }

    closeTaskFormPanel(): void {
        this.showTaskFormPanel = false;
        this.selectedTask = null;
        this.selectedTaskForm = null;
        this.taskFormValues = {};
        this.taskFormLoading = false;
        this.taskFormSaving = false;
    }

    onDynamicFieldInput(fieldId: string, event: Event): void {
        const target = event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

        this.taskFormValues = {
            ...this.taskFormValues,
            [fieldId]: target.value
        };
    }

    onDynamicCheckboxChange(fieldId: string, event: Event): void {
        const target = event.target as HTMLInputElement;

        this.taskFormValues = {
            ...this.taskFormValues,
            [fieldId]: target.checked
        };
    }


    getTaskStatusLabel(status: string): string {
        switch (status) {
            case 'NEW':
                return 'Recién llegada';
            case 'IN_PROGRESS':
                return 'En proceso';
            case 'COMPLETED':
                return 'Terminada';
            case 'REJECTED':
                return 'Rechazada';
            case 'RETURNED':
                return 'Devuelta';
            case 'CANCELLED':
                return 'Cancelada';
            default:
                return status;
        }
    }

    getTaskStatusClasses(status: string): string {
        switch (status) {
            case 'NEW':
                return 'bg-rose-50 text-rose-700 border-rose-200';
            case 'IN_PROGRESS':
                return 'bg-amber-50 text-amber-700 border-amber-200';
            case 'COMPLETED':
                return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            default:
                return 'bg-slate-50 text-slate-600 border-slate-200';
        }
    }

    trackTaskById(index: number, task: WorkflowTask): string {
        return task.id;
    }

    completeSelectedTask(): void {
        if (!this.selectedTask) {
            return;
        }

        const userId = this.userId.trim();

        if (!userId) {
            this.errorMessage = 'Ingresa un userId para completar la tarea.';
            return;
        }

        this.completingTaskId = this.selectedTask.id;
        this.errorMessage = '';
        this.successMessage = '';

        this.workflowTaskApi.completeTask(this.selectedTask.id, userId).subscribe({
            next: () => {
                this.successMessage = 'Tarea completada correctamente. El workflow avanzó al siguiente paso.';
                this.closeTaskFormPanel();
                this.loadTasks();
            },
            error: (error) => {
                console.error('Error al completar tarea:', error);
                this.errorMessage = 'No se pudo completar la tarea.';
            },
            complete: () => {
                this.completingTaskId = null;
            }
        });
    }

    saveSubmissionAndCompleteTask(): void {
  if (!this.selectedTask) {
    return;
  }

  const userId = this.userId.trim();

  if (!userId) {
    this.errorMessage = 'Ingresa un userId para completar la tarea.';
    return;
  }

  this.taskFormSaving = true;
  this.completingTaskId = this.selectedTask.id;
  this.errorMessage = '';
  this.successMessage = '';

  this.submissionApi.saveSubmission({
    taskId: this.selectedTask.id,
    userId,
    values: this.taskFormValues
  }).pipe(
    switchMap(() =>
      this.workflowTaskApi.completeTask(
        this.selectedTask!.id,
        userId
      )
    ),
    finalize(() => {
      this.taskFormSaving = false;
      this.completingTaskId = null;
    })
  ).subscribe({
    next: () => {
      this.successMessage = 'Respuesta guardada y tarea completada correctamente.';
      this.closeTaskFormPanel();
      this.loadTasks();
    },
    error: (error) => {
      console.error('Error al guardar/completar tarea:', error);
      this.errorMessage = 'No se pudo completar la tarea. Verifica que la tarea siga en proceso.';
    }
  });
}

    saveTaskFormSubmission(): void {
        if (!this.selectedTask) {
            return;
        }

        const userId = this.userId.trim();

        if (!userId) {
            this.errorMessage = 'Ingresa un userId para guardar la respuesta.';
            return;
        }

        this.taskFormSaving = true;
        this.errorMessage = '';
        this.successMessage = '';

        this.submissionApi.saveSubmission({
            taskId: this.selectedTask.id,
            userId,
            values: this.taskFormValues
        }).pipe(
            finalize(() => {
                this.taskFormSaving = false;
            })
        ).subscribe({
            next: () => {
                this.successMessage = 'Respuesta del formulario guardada correctamente.';
                this.loadTasks();
            },
            error: (error) => {
                console.error('Error al guardar respuesta:', error);
                this.errorMessage = 'No se pudo guardar la respuesta del formulario.';
            }
        });
    }
}