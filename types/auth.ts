export type UserRole = 'FARMER' | 'ADMIN';

export interface AuthUser {
  id: string;
  phoneNumber: string;
  name: string;
  role: UserRole;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
  requiresProfileSetup?: boolean;
}

export interface SendOtpResult {
  phoneNumber: string;
}

export interface ProfileSetupInput {
  name: string;
}
