import { Routes } from '@angular/router';
import { adminGuard, authGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./layouts/public-layout').then((module) => module.PublicLayoutComponent),
    children: [
      { path: '', loadComponent: () => import('./features/public/home').then((module) => module.HomeComponent) },
      { path: 'reportar', loadComponent: () => import('./features/public/report-incident').then((module) => module.ReportIncidentComponent) },
      { path: 'acompanhar', loadComponent: () => import('./features/public/tracking').then((module) => module.TrackingComponent) },
      { path: 'conta', loadComponent: () => import('./features/public/account').then((module) => module.AccountComponent), canActivate: [authGuard] },
      { path: 'ocorrencias', loadComponent: () => import('./features/public/incidents').then((module) => module.IncidentsComponent) },
      { path: 'mapa', loadComponent: () => import('./features/public/connectivity-map').then((module) => module.ConnectivityMapComponent) },
    ],
  },
  { path: 'auth', loadComponent: () => import('./features/auth/login').then((module) => module.LoginComponent) },
  {
    path: 'admin',
    loadComponent: () => import('./layouts/admin-layout').then((module) => module.AdminLayoutComponent),
    canActivate: [adminGuard],
    children: [
      { path: '', loadComponent: () => import('./features/admin/dashboard').then((module) => module.AdminDashboardComponent) },
      { path: 'ocorrencias', loadComponent: () => import('./features/admin/incidents').then((module) => module.AdminIncidentsComponent) },
      { path: 'analytics', loadComponent: () => import('./features/admin/analytics').then((module) => module.AdminAnalyticsComponent) },
      { path: 'ia', loadComponent: () => import('./features/admin/ai-analysis').then((module) => module.AiAnalysisComponent) },
      { path: 'definicoes', loadComponent: () => import('./features/admin/settings').then((module) => module.AdminSettingsComponent) },
    ],
  },
  { path: '**', redirectTo: '' },
];
