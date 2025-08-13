import { Routes } from '@angular/router';
import { UserRole } from '@core/enum';
import { authGuard } from '@core/guards';
import { AppLayoutComponent } from '@shared/layout/app-layout.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: '',
    component: AppLayoutComponent,
    children: [
      {
        path: 'dashboard',
        canActivate: [authGuard],
        data: { roles: [UserRole.ROLE_admin,UserRole.ROLE_user] }, // optional
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
      },
      {
        path: 'team',
        canActivate: [authGuard],
        data: { roles: [UserRole.ROLE_admin,UserRole.ROLE_user] }, // optional
        loadComponent: () =>
          import('./features/teams/teams.component').then(m => m.TeamsComponent),
      },
    ]
  }
];