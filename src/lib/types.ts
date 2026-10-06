export type Role = "admin" | "editor" | "viewer";
export type Status = "active" | "inactive" | "pending";

/** Usuario tal como se expone al cliente (nunca incluye credenciales). */
export interface PublicUser {
  id: number;
  name: string;
  email: string;
  role: Role;
  status: Status;
  created_at: string;
  last_login: string | null;
}

export interface Metrics {
  totalUsers: number;
  activeUsers: number;
  adminUsers: number;
  pendingUsers: number;
  newLast30Days: number;
}

export interface UsersResponse {
  data: PublicUser[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface LoginResponse {
  token: string;
  user: PublicUser;
}

export interface MeResponse {
  user: PublicUser;
}
