export const REFRESH_COOKIE = 'aa_refresh';

export type TokenPurpose = 'access' | 'refresh' | 'reset';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  typ: TokenPurpose;
  iat?: number;
  exp?: number;
}
