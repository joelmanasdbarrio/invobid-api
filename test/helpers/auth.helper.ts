import path from 'path';
import { CreateAdminDto } from 'src/app/user/admin/dto/create-admin.dto';
import { CreateInvestorDto } from 'src/app/user/investor/dto/create-investor.dto';
import request from 'supertest';
import { App } from 'supertest/types';

const API = '/api/v1';

export interface AuthResult {
  accessToken: string;
  user: Record<string, any>;
  response: request.Response;
}

export async function registerAdmin(
  server: App,
  dto: CreateAdminDto,
): Promise<AuthResult> {
  const res = await request(server)
    .post(`${API}/auth/register/admin`)
    .send(dto);

  return {
    accessToken: res.body.access_token,
    user: res.body.data,
    response: res,
  };
}

export async function registerInvestor(
  server: App,
  dto: CreateInvestorDto,
  filePath?: string,
): Promise<AuthResult> {
  const req = request(server).post(`${API}/auth/register/investor`);

  // Attach fields
  for (const [key, value] of Object.entries(dto)) {
    if (value !== undefined) {
      req.field(key, String(value));
    }
  }

  // Attach file
  const docPath =
    filePath || path.join(__dirname, '..', 'sample_files', 'nif.jpg');
  req.attach('document', docPath);

  const res = await req;

  return {
    accessToken: res.body.access_token,
    user: res.body.data,
    response: res,
  };
}

export async function loginUser(
  server: App,
  email: string,
  password: string,
  options?: { rememberMe?: boolean; activateAccount?: boolean },
): Promise<AuthResult> {
  const req = request(server).post(`${API}/auth/login`).send({
    email,
    password,
    rememberMe: options?.rememberMe,
  });

  if (options?.activateAccount) {
    req.set('x-activate-account', 'true');
  }

  const res = await req;

  return {
    accessToken: res.body.access_token,
    user: res.body.data,
    response: res,
  };
}

export function authHeader(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}

/**
 * Verify an investor by updating their status via admin.
 */
export async function verifyInvestor(
  server: App,
  adminToken: string,
  investorId: string,
): Promise<void> {
  await request(server)
    .patch(`${API}/investors/${investorId}`)
    .set({ Authorization: `Bearer ${adminToken}` })
    .send({ status: 'verified' });
}
