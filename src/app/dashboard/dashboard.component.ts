import { Component, OnInit } from '@angular/core';
import { AuthService } from '../auth/auth.service'
import { CommonModule } from '@angular/common'
import { Router } from '@angular/router'

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  email: string | null = null;

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    const user = this.authService.getUser(); // Assuming getUser() retrieves the user details
    if (user && user['attributes'] && user['attributes']['email']) {
      this.email = user['attributes']['email'];
    }
  }

  onLogout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
