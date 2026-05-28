import { ExecutionContext, InternalServerErrorException } from '@nestjs/common';

jest.mock('@nestjs/common', () => {
  const actual =
    jest.requireActual<typeof import('@nestjs/common')>('@nestjs/common');
  return {
    ...actual,
    createParamDecorator: (
      factory: (data: unknown, ctx: ExecutionContext) => unknown,
    ) => factory,
  };
});

import { GetUser } from './get-user.decorator';

const factory = GetUser as unknown as (
  data: string | undefined,
  ctx: ExecutionContext,
) => unknown;

const createMockContext = (user?: object): ExecutionContext =>
  ({
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue({ user }),
    }),
  }) as unknown as ExecutionContext;

describe('GetUser decorator', () => {
  it('should throw InternalServerErrorException when user is missing from request', () => {
    const ctx = createMockContext(undefined);

    expect(() => factory(undefined, ctx)).toThrow(InternalServerErrorException);
  });

  it('should return the full user object when no data arg is provided', () => {
    const user = { id: '1', email: 'user@example.com' };
    const ctx = createMockContext(user);

    expect(factory(undefined, ctx)).toBe(user);
  });

  it('should return user.id when data is "id"', () => {
    const user = { id: '1', email: 'user@example.com' };
    const ctx = createMockContext(user);

    expect(factory('id', ctx)).toBe('1');
  });

  it('should return user.email when data is "email"', () => {
    const user = { id: '1', email: 'user@example.com' };
    const ctx = createMockContext(user);

    expect(factory('email', ctx)).toBe('user@example.com');
  });
});
