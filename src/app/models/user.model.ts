export interface AuthResponse {
  token: string;
  email: string;
  nombre: string;
  roles: string[]; // Aquí guardaremos ["ADMIN"] o ["USER"]
}


export interface LoginRequest {
  email: string;
  password: string;
}

export interface User {
  id: string;
  nombre: string;
  email: string;
  roles: string[]; // Coincide con ['ADMIN']
  activo: boolean; // Coincide con true
  passwordHash?: string; // Opcional para la vista
}