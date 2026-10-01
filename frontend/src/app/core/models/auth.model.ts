export type Role = 'ADMIN' | 'MANAGER' | 'MEMBER';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  avatarUrl?: string | null;
  isActive: boolean;
  role: Role;
  lastLoginAt?: string | null;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export interface RoleInfo {
  name: Role;
  description: string;
}
