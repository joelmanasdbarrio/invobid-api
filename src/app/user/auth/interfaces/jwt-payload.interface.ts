export interface JwtPayload {
  email: string;
  name: string;
  type: 'admin' | 'investor';
}
