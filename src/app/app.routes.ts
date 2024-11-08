import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component'
import { DashboardComponent } from './dashboard/dashboard.component'
import { AuthGuard } from './auth/auth.guard'
import { SignupComponent } from './auth/signup/signup.component'
import { ConfirmComponent } from './auth/confirm/confirm.component'

export const routes: Routes = [
  { path: 'signup', component: SignupComponent },
  { path: 'confirm', component: ConfirmComponent },
  { path: 'login', component: LoginComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard] },
  { path: '**', redirectTo: '/dashboard' },
];
