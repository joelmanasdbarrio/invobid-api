import {
  HttpException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');
const bcryptCompare = bcrypt.compare as jest.MockedFunction<
  typeof bcrypt.compare
>;

import { AdminService } from '../admin/admin.service';
import { User } from '../common/entities/user.entity';
import { UserType } from '../common/enums/user-type.enum';
import { CreateInvestorDto } from '../investor/dto/create-investor.dto';
import { Investor } from '../investor/entities/investor.entity';
import { InvestorStatus } from '../investor/enums/investor-status.enum';
import { InvestorType } from '../investor/enums/investor-type.enum';
import { InvestorService } from '../investor/investor.service';
import { AuthService } from './auth.service';
import { LoginUserDto } from './dto/login-user.dto';

const mockUserRepository = {
  findOne: jest.fn(),
  save: jest.fn(),
};

const mockAdminService = {
  create: jest.fn(),
};

const mockInvestorService = {
  create: jest.fn(),
  findOne: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('signed-token'),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockJwtService.sign.mockReturnValue('signed-token');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        { provide: AdminService, useValue: mockAdminService },
        { provide: InvestorService, useValue: mockInvestorService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    const loginDto: LoginUserDto = {
      email: 'user@example.com',
      password: 'password123',
      rememberMe: false,
    };

    const baseUser = {
      id: 'user-id',
      email: 'user@example.com',
      name: 'Test User',
      password: 'hashed-password',
      type: UserType.ADMIN,
      deletedAt: null,
    };

    beforeEach(() => {
      bcryptCompare.mockResolvedValue(true as never);
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      mockUserRepository.findOne.mockResolvedValue(baseUser);
      bcryptCompare.mockResolvedValue(false as never);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw HttpException 423 when account is deleted and activateAccount is false', async () => {
      mockUserRepository.findOne.mockResolvedValue({
        ...baseUser,
        deletedAt: new Date(),
      });

      await expect(service.login(loginDto, false)).rejects.toThrow(
        new HttpException('User account is locked', 423),
      );
    });

    it('should clear deletedAt and save when account is deleted and activateAccount is true', async () => {
      const deletedUser = { ...baseUser, deletedAt: new Date() };
      mockUserRepository.findOne.mockResolvedValue(deletedUser);
      mockUserRepository.save.mockResolvedValue({
        ...deletedUser,
        deletedAt: null,
      });

      await service.login(loginDto, true);

      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ deletedAt: null }),
      );
    });

    it('should call investorService.findOne when user type is INVESTOR', async () => {
      const investorUser = { ...baseUser, type: UserType.INVESTOR };
      mockUserRepository.findOne.mockResolvedValue(investorUser);
      mockInvestorService.findOne.mockResolvedValue(investorUser);

      await service.login(loginDto);

      expect(mockInvestorService.findOne).toHaveBeenCalledWith(investorUser.id);
    });

    it('should NOT call investorService.findOne when user type is ADMIN', async () => {
      mockUserRepository.findOne.mockResolvedValue(baseUser);

      await service.login(loginDto);

      expect(mockInvestorService.findOne).not.toHaveBeenCalled();
    });

    it('should sign JWT with expiresIn 30d when rememberMe is true', async () => {
      mockUserRepository.findOne.mockResolvedValue(baseUser);

      await service.login({ ...loginDto, rememberMe: true });

      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ expiresIn: '30d' }),
      );
    });

    it('should sign JWT with expiresIn 1d when rememberMe is false', async () => {
      mockUserRepository.findOne.mockResolvedValue(baseUser);

      await service.login(loginDto);

      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ expiresIn: '1d' }),
      );
    });

    it('should return user and access_token on success', async () => {
      mockUserRepository.findOne.mockResolvedValue(baseUser);

      const result = await service.login(loginDto);

      expect(result).toEqual({ user: baseUser, access_token: 'signed-token' });
    });
  });

  describe('registerAdmin', () => {
    const registerAdminDto = {
      email: 'admin@example.com',
      password: 'password123',
      passwordRepeat: 'password123',
      name: 'Admin User',
    };

    const mockAdmin = {
      id: 'admin-id',
      email: 'admin@example.com',
      name: 'Admin User',
    };

    it('should throw InternalServerErrorException when adminService.create returns falsy', async () => {
      mockAdminService.create.mockResolvedValue(null);

      await expect(service.registerAdmin(registerAdminDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should return admin and access_token on success', async () => {
      mockAdminService.create.mockResolvedValue(mockAdmin);

      const result = await service.registerAdmin(registerAdminDto);

      expect(result).toEqual({
        admin: mockAdmin,
        access_token: 'signed-token',
      });
    });

    it('should sign JWT with correct payload for admin', async () => {
      mockAdminService.create.mockResolvedValue(mockAdmin);

      await service.registerAdmin(registerAdminDto);

      expect(mockJwtService.sign).toHaveBeenCalledWith(
        { id: mockAdmin.id, email: mockAdmin.email, type: UserType.ADMIN },
        { expiresIn: '1d' },
      );
    });
  });

  describe('registerInvestor', () => {
    const registerInvestorDto = {
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
      id: 'investor-id',
      email: 'investor@example.com',
      name: 'Investor User',
      companyName: 'Investor User',
      phoneNumber: '+34600000000',
      investorType: InvestorType.INDIVIDUAL,
      status: InvestorStatus.PENDING,
      lastCommunication: null,
      password: 'hashed-password',
    };

    beforeEach(() => {
      mockInvestorService.create.mockResolvedValue(mockInvestor);
    });

    it('should call investorService.create with dto and file', async () => {
      await service.registerInvestor(
        registerInvestorDto as CreateInvestorDto,
        mockFile,
      );

      expect(mockInvestorService.create).toHaveBeenCalledWith(
        registerInvestorDto,
        mockFile,
      );
    });

    it('should sign JWT with correct payload for investor', async () => {
      await service.registerInvestor(
        registerInvestorDto as CreateInvestorDto,
        mockFile,
      );

      expect(mockJwtService.sign).toHaveBeenCalledWith(
        {
          id: mockInvestor.id,
          email: mockInvestor.email,
          type: UserType.INVESTOR,
        },
        { expiresIn: '1d' },
      );
    });

    it('should return partial investor shape and access_token', async () => {
      const result = await service.registerInvestor(
        registerInvestorDto as CreateInvestorDto,
        mockFile,
      );

      expect(result.access_token).toBe('signed-token');
      expect(result.investor).toMatchObject({
        id: mockInvestor.id,
        email: mockInvestor.email,
        name: mockInvestor.name,
        companyName: mockInvestor.companyName,
        phoneNumber: mockInvestor.phoneNumber,
        type: UserType.INVESTOR,
        investorType: mockInvestor.investorType,
        status: mockInvestor.status,
      });
      // password must not be present in the returned partial
      expect((result.investor as Investor).password).toBeUndefined();
    });
  });
});
