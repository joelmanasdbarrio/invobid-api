import { HttpException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../../common/entities/user.entity';
import { UserType } from '../../common/enums/user-type.enum';
import { InvestorService } from '../../investor/investor.service';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { JwtStrategy } from './jwt.strategy';

const mockUserRepository = {
  findOne: jest.fn(),
};

const mockConfigService = {
  get: jest.fn().mockReturnValue('test-secret'),
};

const mockInvestorService = {
  findOne: jest.fn(),
};

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: InvestorService, useValue: mockInvestorService },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    const payload: JwtPayload = {
      email: 'user@example.com',
      name: 'Test User',
      type: 'admin',
    };

    const baseUser = {
      id: 'user-id',
      email: 'user@example.com',
      name: 'Test User',
      type: UserType.ADMIN,
      deletedAt: null,
    };

    it('should throw UnauthorizedException when user is not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(strategy.validate(payload)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw HttpException with status 423 when user account is disabled', async () => {
      mockUserRepository.findOne.mockResolvedValue({
        ...baseUser,
        deletedAt: new Date(),
      });

      await expect(strategy.validate(payload)).rejects.toThrow(
        new HttpException('User has been disabled', 423),
      );
    });

    it('should return the user directly when type is ADMIN', async () => {
      mockUserRepository.findOne.mockResolvedValue(baseUser);

      const result = await strategy.validate(payload);

      expect(mockInvestorService.findOne).not.toHaveBeenCalled();
      expect(result).toBe(baseUser);
    });

    it('should call investorService.findOne and return the investor when type is INVESTOR', async () => {
      const investorUser = { ...baseUser, type: UserType.INVESTOR };
      const fullInvestor = {
        ...investorUser,
        companyName: 'Acme',
        status: 'verified',
      };

      mockUserRepository.findOne.mockResolvedValue(investorUser);
      mockInvestorService.findOne.mockResolvedValue(fullInvestor);

      const result = await strategy.validate(payload);

      expect(mockInvestorService.findOne).toHaveBeenCalledWith(investorUser.id);
      expect(result).toBe(fullInvestor);
    });
  });
});
