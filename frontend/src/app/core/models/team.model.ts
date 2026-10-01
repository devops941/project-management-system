import { Role } from './auth.model';

export interface TeamMemberEntry {
  id: string;
  joinedAt: string;
  user: { id: string; name: string; email: string; role: { name: Role } };
}

export interface Team {
  id: string;
  name: string;
  description?: string | null;
  createdAt?: string;
  project?: { id: string; name: string; code: string; status: string } | null;
  lead?: { id: string; name: string; email: string } | null;
  members: TeamMemberEntry[];
}

export interface TeamPayload {
  name: string;
  description?: string | null;
  projectId?: string | null;
  leadId?: string | null;
  memberIds?: string[];
}
