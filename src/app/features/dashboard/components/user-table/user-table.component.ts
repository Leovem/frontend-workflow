import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService } from '../../../../core/services/user.service';
import { User } from '../../../../models/user.model';

@Component({
  selector: 'app-user-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-table.component.html'
})
export class UserTableComponent implements OnInit {
  private userService = inject(UserService);
  private cdr = inject(ChangeDetectorRef); // 🚩 Inyectamos el "despertador" de Angular

  users: User[] = [];
  isLoading: boolean = false;

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.isLoading = true;
    this.cdr.detectChanges(); 

    this.userService.getAllUsers().subscribe({
      next: (data) => {
        console.log('✅ Datos recibidos de la API:', data);
        this.users = data;
        this.isLoading = false;
        this.cdr.detectChanges(); 
      },
      error: (err) => {
        console.error('❌ Error al cargar:', err);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }
}