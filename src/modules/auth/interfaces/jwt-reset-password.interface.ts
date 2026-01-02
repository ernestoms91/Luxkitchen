export interface ResetPasswordPayload {
  sub: number;
  type: 'reset-password';
  iat: number;
  exp: number;
}