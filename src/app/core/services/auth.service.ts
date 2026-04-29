import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { jwtDecode } from 'jwt-decode';

import { LoginRequest } from '../../models/user.model';
import { API_ENDPOINTS } from '../config/api-endpoints';

interface JwtPayload {
  sub?: string;
  id?: string;
  nombre?: string;
  roles?: any[];
  exp?: number;
  iat?: number;
}

export interface AuthUserData {
  id?: string;
  email?: string;
  nombre: string;
  roles: string[];
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = `${API_ENDPOINTS.auth}/login`;

  login(credentials: LoginRequest) {
    return this.http.post<{ token: string }>(this.apiUrl, credentials).pipe(
      tap(res => {
        if (res.token) {
          localStorage.setItem('token', res.token);

          const decoded = this.decodeToken(res.token);

          console.log('JWT decodificado:', decoded);
          console.log('Roles normalizados:', this.normalizeRoles(decoded?.roles ?? []));
          console.log('✅ JWT guardado correctamente');
        }
      })
    );
  }

  getUserData(): AuthUserData | null {
    const token = localStorage.getItem('token');

    if (!token) return null;

    const decoded = this.decodeToken(token);

    if (!decoded) return null;

    if (this.isTokenExpired(decoded)) {
      this.logout();
      return null;
    }

    const roles = this.normalizeRoles(decoded.roles ?? []);

    return {
      id: decoded.id,
      email: decoded.sub,
      nombre: decoded.nombre ?? decoded.sub ?? 'Usuario',
      roles
    };
  }

  getRoles(): string[] {
    return this.getUserData()?.roles ?? [];
  }

  isAdmin(): boolean {
    const roles = this.getRoles();

    return roles.includes('ADMIN') || roles.includes('ROLE_ADMIN');
  }

  isLoggedIn(): boolean {
    return !!this.getUserData();
  }

  logout(): void {
    localStorage.removeItem('token');
  }

  private decodeToken(token: string): JwtPayload | null {
    try {
      return jwtDecode<JwtPayload>(token);
    } catch (error) {
      console.error('Token inválido:', error);
      return null;
    }
  }

  private normalizeRoles(rawRoles: any[]): string[] {
    if (!Array.isArray(rawRoles)) return [];

    return rawRoles
      .map(role => {
        if (typeof role === 'string') {
          return role;
        }

        if (role?.authority) {
          return role.authority;
        }

        if (role?.name) {
          return role.name;
        }

        if (role?.nombre) {
          return role.nombre;
        }

        return '';
      })
      .filter(Boolean)
      .map(role => role.toUpperCase());
  }

  private isTokenExpired(decoded: JwtPayload): boolean {
    if (!decoded.exp) return false;

    const nowInSeconds = Math.floor(Date.now() / 1000);

    return decoded.exp < nowInSeconds;
  }
}