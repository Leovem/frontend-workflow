import { Routes } from '@angular/router';

import { LoginComponent } from './features/auth/login/login.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { UserTableComponent } from './features/dashboard/components/user-table/user-table.component';
import { UserProfileComponent } from './features/dashboard/components/user-profile/user-profile.component';

import { EditorLayoutComponent } from './layouts/editor-layout/editor-layout.component';

import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent
  },

  {
    path: 'tasks',
    loadComponent: () =>
      import('./features/task-inbox/pages/task-inbox/task-inbox.component')
        .then(m => m.TaskInboxComponent)
  },

  {
    path: 'monitor',
    loadComponent: () =>
      import('./features/workflow-monitor/pages/workflow-monitor/workflow-monitor.component')
        .then(m => m.WorkflowMonitorComponent)
  },

  {
    path: 'start-instance',
    loadComponent: () =>
      import('./features/workflow-instance/pages/start-workflow-instance/start-workflow-instance.component')
        .then(m => m.StartWorkflowInstanceComponent)
  },

  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'admin',
        component: UserTableComponent
      },
      {
        path: 'profile',
        component: UserProfileComponent
      },
      {
        path: 'projects',
        loadComponent: () =>
          import('./features/workflow-projects/workflow-projects.component')
            .then(m => m.WorkflowProjectsComponent)
      },
      {
        path: '',
        redirectTo: 'profile',
        pathMatch: 'full'
      }
    ]
  },

  {
    path: 'workflow-projects/:projectId/editor',
    component: EditorLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/process-editor/process-editor.component')
            .then(m => m.ProcessEditorComponent)
      }
    ]
  },

  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full'
  },

  {
    path: '**',
    redirectTo: '/login'
  }
];