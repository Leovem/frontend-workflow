import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-profile.component.html'
})
export class UserProfileComponent implements OnInit {
  private authService = inject(AuthService);
  userData: any = null;

  ngOnInit() {
    // El perfil simplemente lee los datos que ya tenemos del token
    this.userData = this.authService.getUserData();
  }
}