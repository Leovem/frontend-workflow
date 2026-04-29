import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterOutlet, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterModule],
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent implements OnInit {
  public authService = inject(AuthService);
  private router = inject(Router);

  userName = '';
  isAdmin = false;

  ngOnInit(): void {
    const user = this.authService.getUserData();

    if (!user) {
      this.handleLogout();
      return;
    }

    this.userName = user.nombre;
    this.isAdmin = this.authService.isAdmin();

    console.log('Usuario dashboard:', user);
    console.log('¿Es admin?:', this.isAdmin);
  }

  handleLogout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}