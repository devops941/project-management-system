import { Role } from './auth.model';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  avatarUrl?: string | null;
  isActive: boolean;
  lastLoginAt?: string | null;
  createdAt?: string;
  role: { id?: string; name: Role };
  _count?: { assignments: number; teamMembers: number };
}

export interface UserPayload {
  name: string;
  email: string;
  password?: string;
  role: Role;
  phone?: string | null;
  isActive?: boolean;
}
