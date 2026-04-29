import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import {
  WorkflowProject,
  WorkflowProjectService
} from '../../core/services/workflow-project.service';

interface JwtPayload {
  id?: string;
  nombre?: string;
  email?: string;
  roles?: string[];
  sub?: string;
  exp?: number;
  iat?: number;
}

@Component({
  selector: 'app-workflow-projects',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './workflow-projects.component.html'
})
export class WorkflowProjectsComponent implements OnInit {
  projects: WorkflowProject[] = [];

  accessCode = '';

  loading = false;
  creating = false;
  joining = false;

  errorMessage = '';
  successMessage = '';

  isAdmin = false;
  userName = '';

  constructor(
    private projectService: WorkflowProjectService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadUserFromToken();
    this.loadProjects();
  }

  loadProjects(): void {
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.detectChanges();

    this.projectService.getMyProjects().subscribe({
      next: (projects) => {
        this.projects = projects ?? [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error cargando proyectos:', error);

        this.projects = [];
        this.loading = false;
        this.errorMessage = 'No se pudieron cargar los proyectos.';
        this.cdr.detectChanges();
      }
    });
  }

  createProject(): void {
    if (!this.isAdmin) {
      this.errorMessage = 'Solo el administrador puede crear proyectos.';
      this.cdr.detectChanges();
      return;
    }

    if (this.creating) return;

    this.creating = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.detectChanges();

    this.projectService.create({
      name: 'Nuevo Proyecto',
      description: 'Proyecto colaborativo'
    }).subscribe({
      next: (project) => {
        this.creating = false;
        this.successMessage = 'Proyecto creado correctamente.';
        this.cdr.detectChanges();

        this.openProject(project.id);
      },
      error: (error) => {
        console.error('Error creando proyecto:', error);

        this.creating = false;
        this.errorMessage = 'No se pudo crear el proyecto.';
        this.cdr.detectChanges();
      }
    });
  }

  joinProject(): void {
    const code = this.normalizeAccessCode(this.accessCode);

    if (!code || this.joining) return;

    this.joining = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.detectChanges();

    this.projectService.joinByCode(code).subscribe({
      next: (project) => {
        this.joining = false;
        this.accessCode = '';
        this.successMessage = 'Te uniste al proyecto correctamente.';
        this.cdr.detectChanges();

        this.openProject(project.id);
      },
      error: (error) => {
        console.error('Error entrando al proyecto:', error);

        this.joining = false;
        this.errorMessage = 'Código inválido o proyecto no disponible.';
        this.cdr.detectChanges();
      }
    });
  }

  openProject(projectId: string): void {
    if (!projectId) return;

    this.router.navigate(['/workflow-projects', projectId, 'editor']);
  }

  trackByProjectId(index: number, project: WorkflowProject): string {
    return project.id;
  }

  private loadUserFromToken(): void {
    const payload = this.getTokenPayload();

    if (!payload) {
      this.isAdmin = false;
      this.userName = '';
      return;
    }

    const roles = payload.roles ?? [];

    this.isAdmin =
      roles.includes('ADMIN') ||
      roles.includes('ROLE_ADMIN');

    this.userName = payload.nombre ?? payload.email ?? payload.sub ?? '';
  }

  private getTokenPayload(): JwtPayload | null {
    const token = localStorage.getItem('token');

    if (!token) return null;

    try {
      const payloadBase64 = token.split('.')[1];

      if (!payloadBase64) return null;

      const payloadJson = atob(payloadBase64);
      return JSON.parse(payloadJson) as JwtPayload;
    } catch (error) {
      console.error('Token inválido:', error);
      return null;
    }
  }

  private normalizeAccessCode(code: string): string {
    return code.trim().toUpperCase();
  }
}