export interface User {
  id: string;
  email: string;
  username: string;
  createdAt: string;
}

export interface SessionResponse {
  user: User | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest extends LoginRequest {
  username: string;
}
