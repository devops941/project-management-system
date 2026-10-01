import { Routes } from '@angular/router';
import { authGuard, guestGuard, roleGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
    title: 'Sign in | PMS',
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/shell/shell').then((m) => m.Shell),
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
        title: 'Dashboard | PMS',
      },
      {
        path: 'projects',
        loadComponent: () => import('./features/projects/projects').then((m) => m.Projects),
        title: 'Projects | PMS',
      },
      {
        path: 'projects/:id',
        loadComponent: () => import('./features/projects/project-detail').then((m) => m.ProjectDetail),
        title: 'Project | PMS',
      },
      {
        path: 'teams',
        loadComponent: () => import('./features/teams/teams').then((m) => m.Teams),
        title: 'Teams | PMS',
      },
      {
        path: 'tasks',
        loadComponent: () => import('./features/tasks/tasks').then((m) => m.Tasks),
        title: 'Tasks | PMS',
      },
      {
        path: 'board',
        loadComponent: () => import('./features/board/board').then((m) => m.Board),
        title: 'Kanban Board | PMS',
      },
      {
        path: 'deadlines',
        loadComponent: () => import('./features/deadlines/deadlines').then((m) => m.Deadlines),
        title: 'Deadlines | PMS',
      },
      {
        path: 'reports',
        canActivate: [roleGuard('ADMIN', 'MANAGER')],
        loadComponent: () => import('./features/reports/reports').then((m) => m.Reports),
        title: 'Reports | PMS',
      },
      {
        path: 'users',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () => import('./features/users/users').then((m) => m.Users),
        title: 'Users | PMS',
      },
      {
        path: 'notifications',
        loadComponent: () => import('./features/notifications/notifications').then((m) => m.Notifications),
        title: 'Notifications | PMS',
      },
      {
        path: 'profile',
        loadComponent: () => import('./features/profile/profile').then((m) => m.Profile),
        title: 'Profile | PMS',
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
