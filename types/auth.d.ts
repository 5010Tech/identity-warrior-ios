export interface AuthBody {
  baseUrl: string;
  usernameOrEmail: string;
  apiKey: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  username: string;
  email: string;
  message: string;
}
export interface AppUser {
  username: string;
  email: string;
  message: string;
}
