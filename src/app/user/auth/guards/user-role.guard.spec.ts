import {
  ExecutionContext,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserType } from 'src/app/user/common/enums/user-type.enum';
import { InvestorStatus } from 'src/app/user/investor/enums/investor-status.enum';
import { InvestorType } from 'src/app/user/investor/enums/investor-type.enum';
import { META_ROLES, META_STATUS } from '../decorators/user-role.decorator';
import { UserRoleGuard } from './user-role.guard';

const createMockContext = (user?: object): ExecutionContext =>
  ({
    getHandler: jest.fn().mockReturnValue({}),
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue({ user }),
    }),
  }) as unknown as ExecutionContext;

describe('UserRoleGuard', () => {
  let guard: UserRoleGuard;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(() => {
    reflector = { get: jest.fn() } as unknown as jest.Mocked<Reflector>;
    guard = new UserRoleGuard(reflector);
  });

  const setupReflector = (
    roles: (UserType | InvestorType)[],
    status: InvestorStatus[],
  ) => {
    reflector.get.mockImplementation((key: string) => {
      if (key === META_ROLES) return roles;
      if (key === META_STATUS) return status;
    });
  };

  it('should return true when no roles or status are defined', () => {
    setupReflector([], []);
    const ctx = createMockContext();

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should throw InternalServerErrorException when user is missing from request', () => {
    setupReflector([UserType.ADMIN], []);
    const ctx = createMockContext(undefined);

    expect(() => guard.canActivate(ctx)).toThrow(InternalServerErrorException);
  });

  it('should return true when user.type matches a valid role', () => {
    setupReflector([UserType.ADMIN], []);
    const ctx = createMockContext({ type: UserType.ADMIN });

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should return true when investor.investorType matches a valid role', () => {
    setupReflector([InvestorType.INDIVIDUAL], []);
    const ctx = createMockContext({
      type: UserType.INVESTOR,
      investorType: InvestorType.INDIVIDUAL,
    });

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should throw ForbiddenException when user type does not match any valid role', () => {
    setupReflector([UserType.ADMIN], []);
    const ctx = createMockContext({ type: UserType.INVESTOR });

    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('should return true for admin regardless of status requirement', () => {
    setupReflector([], [InvestorStatus.VERIFIED]);
    const ctx = createMockContext({ type: UserType.ADMIN });

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should return true when investor has a valid status', () => {
    setupReflector([], [InvestorStatus.VERIFIED]);
    const ctx = createMockContext({
      type: UserType.INVESTOR,
      status: InvestorStatus.VERIFIED,
    });

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should throw ForbiddenException when investor status does not match', () => {
    setupReflector([], [InvestorStatus.VERIFIED]);
    const ctx = createMockContext({
      type: UserType.INVESTOR,
      status: InvestorStatus.PENDING,
    });

    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('should return true when both role and status match', () => {
    setupReflector([UserType.INVESTOR], [InvestorStatus.VERIFIED]);
    const ctx = createMockContext({
      type: UserType.INVESTOR,
      status: InvestorStatus.VERIFIED,
    });

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should throw ForbiddenException when role matches but status does not', () => {
    setupReflector([UserType.INVESTOR], [InvestorStatus.VERIFIED]);
    const ctx = createMockContext({
      type: UserType.INVESTOR,
      status: InvestorStatus.PENDING,
    });

    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });
});
