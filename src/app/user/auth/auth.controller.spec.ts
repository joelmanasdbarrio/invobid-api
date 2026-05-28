import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { Admin } from 'typeorm';
import { CreateAdminDto } from '../admin/dto/create-admin.dto';
import { CreateInvestorDto } from '../investor/dto/create-investor.dto';
import { Investor } from '../investor/entities/investor.entity';
import { InvestorType } from '../investor/enums/investor-type.enum';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginUserDto } from './dto/login-user.dto';

const mockAuthService = {
  login: jest.fn(),
  registerAdmin: jest.fn(),
  registerInvestor: jest.fn(),
};

const createMockRes = (): jest.Mocked<Partial<Response>> => ({
  cookie: jest.fn(),
  status: jest.fn().mockReturnThis(),
});

describe('AuthController', () => {
  let controller: AuthController;
  let authService: typeof mockAuthService;
  let res: ReturnType<typeof createMockRes>;

  beforeEach(async () => {
    jest.clearAllMocks();
    res = createMockRes();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    const loginDto: LoginUserDto = {
      email: 'user@example.com',
      password: 'password123',
      rememberMe: false,
    };

    const mockUser = { id: '1', email: 'user@example.com', name: 'Test User' };
    const mockToken = 'jwt-token';

    beforeEach(() => {
      authService.login.mockResolvedValue({
        user: mockUser,
        access_token: mockToken,
      });
    });

    it('should return status, user data and access_token', async () => {
      const result = await controller.login(loginDto, 'false', res as Response);

      expect(result).toEqual({
        status: 'success',
        data: mockUser,
        access_token: mockToken,
      });
    });

    it('should set the access_token cookie', async () => {
      await controller.login(loginDto, 'false', res as Response);

      expect(res.cookie).toHaveBeenCalledWith(
        'access_token',
        mockToken,
        expect.objectContaining({ httpOnly: true, sameSite: 'lax' }),
      );
    });

    it('should set maxAge to 30 days when rememberMe is true', async () => {
      const dto: LoginUserDto = { ...loginDto, rememberMe: true };

      await controller.login(dto, 'false', res as Response);

      expect(res.cookie).toHaveBeenCalledWith(
        'access_token',
        mockToken,
        expect.objectContaining({ maxAge: 30 * 24 * 60 * 60 * 1000 }),
      );
    });

    it('should set maxAge to 1 day when rememberMe is false', async () => {
      await controller.login(loginDto, 'false', res as Response);

      expect(res.cookie).toHaveBeenCalledWith(
        'access_token',
        mockToken,
        expect.objectContaining({ maxAge: 24 * 60 * 60 * 1000 }),
      );
    });

    it('should call authService.login with activateAccount=true when header is "true"', async () => {
      await controller.login(loginDto, 'true', res as Response);

      expect(authService.login).toHaveBeenCalledWith(loginDto, true);
    });

    it('should call authService.login with activateAccount=false when header is absent or other value', async () => {
      await controller.login(loginDto, undefined, res as Response);

      expect(authService.login).toHaveBeenCalledWith(loginDto, false);
    });

    it('should propagate errors thrown by authService.login', async () => {
      authService.login.mockRejectedValue(
        new UnauthorizedException('Invalid credentials'),
      );

      await expect(
        controller.login(loginDto, 'false', res as Response),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('registerAdmin', () => {
    const registerAdminDto: CreateAdminDto = {
      email: 'admin@example.com',
      password: 'password123',
      passwordRepeat: 'password123',
      name: 'Admin User',
    };

    const mockAdmin = {
      id: '1',
      email: 'admin@example.com',
      name: 'Admin User',
      password: 'hashed-password',
    };
    const mockToken = 'admin-jwt-token';

    beforeEach(() => {
      authService.registerAdmin.mockResolvedValue({
        admin: { ...mockAdmin },
        access_token: mockToken,
      });
    });

    it('should return status, admin data and access_token', async () => {
      const result = await controller.registerAdmin(
        registerAdminDto,
        res as Response,
      );

      expect(result).toMatchObject({
        status: 'success',
        access_token: mockToken,
      });
    });

    it('should strip password from the returned admin data', async () => {
      const result = await controller.registerAdmin(
        registerAdminDto,
        res as Response,
      );

      expect((result.data as Admin).password).toBeUndefined();
    });

    it('should set cookie with httpOnly, sameSite and maxAge of 1 day', async () => {
      await controller.registerAdmin(registerAdminDto, res as Response);

      expect(res.cookie).toHaveBeenCalledWith(
        'access_token',
        mockToken,
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
          maxAge: 24 * 60 * 60 * 1000,
        }),
      );
    });
  });

  // ─── registerInvestor ─────────────────────────────────────────────────────

  describe('registerInvestor', () => {
    const registerInvestorDto: CreateInvestorDto = {
      investorType: InvestorType.INDIVIDUAL,
      name: 'Investor User',
      companyName: 'Investor User',
      email: 'investor@example.com',
      phoneNumber: '+34600000000',
      taxId: '12345678A',
      password: 'password123',
      passwordRepeat: 'password123',
    };

    const mockFile = {
      fieldname: 'document',
      originalname: 'doc.pdf',
      mimetype: 'application/pdf',
      buffer: Buffer.from(''),
      size: 0,
    } as Express.Multer.File;

    const mockInvestor = {
      id: '2',
      email: 'investor@example.com',
      name: 'Investor User',
      password: 'hashed-password',
    };
    const mockToken = 'investor-jwt-token';

    beforeEach(() => {
      authService.registerInvestor.mockResolvedValue({
        investor: { ...mockInvestor },
        access_token: mockToken,
      });
    });

    it('should call authService.registerInvestor with dto and file', async () => {
      await controller.registerInvestor(
        registerInvestorDto,
        mockFile,
        res as Response,
      );

      expect(authService.registerInvestor).toHaveBeenCalledWith(
        registerInvestorDto,
        mockFile,
      );
    });

    it('should return status, investor data and access_token', async () => {
      const result = await controller.registerInvestor(
        registerInvestorDto,
        mockFile,
        res as Response,
      );

      expect(result).toMatchObject({
        status: 'success',
        access_token: mockToken,
      });
    });

    it('should strip password from the returned investor data', async () => {
      const result = await controller.registerInvestor(
        registerInvestorDto,
        mockFile,
        res as Response,
      );

      expect((result.data as Investor).password).toBeUndefined();
    });

    it('should set cookie with httpOnly, sameSite and maxAge of 1 day', async () => {
      await controller.registerInvestor(
        registerInvestorDto,
        mockFile,
        res as Response,
      );

      expect(res.cookie).toHaveBeenCalledWith(
        'access_token',
        mockToken,
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
          maxAge: 24 * 60 * 60 * 1000,
        }),
      );
    });
  });
});
