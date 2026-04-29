import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { LoginRequest } from '../../../models/user.model'; 

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html'
})
export class LoginComponent {
  credentials: LoginRequest = { 
    email: '', 
    password: '' 
  };

  private authService = inject(AuthService);
  private router = inject(Router);

  errorMessage = '';

  onLogin() {
    this.authService.login(this.credentials).subscribe({
      next: (response) => {
        console.log('¡Login exitoso!', response);

        const userData = this.authService.getUserData();

        if (userData && userData.roles.includes('ADMIN')) {
          console.log('👮 Perfil detectado: Administrador');
          this.router.navigate(['/dashboard/admin']); 
        } else {
          console.log('👨‍💻 Perfil detectado: Usuario estándar');
          this.router.navigate(['/dashboard/profile']);
        }
      },
      error: (err) => {
        console.error('Error en el login', err);
        this.errorMessage = 'Credenciales incorrectas. Intenta de nuevo.';
      }
    });
  }
}