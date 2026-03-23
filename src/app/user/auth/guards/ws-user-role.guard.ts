import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { User } from 'src/app/user/common/entities/user.entity';
import { UserType } from '../../common/enums/user-type.enum';
import { Investor } from '../../investor/entities/investor.entity';
import { InvestorStatus } from '../../investor/enums/investor-status.enum';
import { InvestorType } from '../../investor/enums/investor-type.enum';
import { META_ROLES, META_STATUS } from '../decorators/user-role.decorator';

@Injectable()
export class WsUserRoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const validRoles: (UserType | InvestorType)[] = this.reflector.get<
      (UserType | InvestorType)[]
    >(META_ROLES, ctx.getHandler());

    const validStatus: InvestorStatus[] = this.reflector.get<InvestorStatus[]>(
      META_STATUS,
      ctx.getHandler(),
    );

    if (
      (!validRoles || validRoles.length === 0) &&
      (!validStatus || validStatus.length === 0)
    )
      return true;

    const client: Socket = ctx.switchToWs().getClient<Socket>();
    const user = (client.data as Record<string, unknown>)?.user as
      | User
      | undefined;

    if (!user) throw new WsException('User not found in request');

    const hasValidRole = this.checkValidRole(user, validRoles);
    const hasValidStatus = this.checkValidStatus(user, validStatus);

    if (hasValidRole && hasValidStatus) return true;

    throw new WsException("You don't have permissions to perform this action");
  }

  private checkValidRole(
    user: User,
    validRoles: (UserType | InvestorType)[],
  ): boolean {
    if (!validRoles || validRoles.length === 0) return true;

    for (const role of validRoles) {
      if (user.type === role) return true;
      if (
        (user as Investor).investorType &&
        (user as Investor).investorType === role
      )
        return true;
    }
    return false;
  }

  private checkValidStatus(user: User, validStatus: InvestorStatus[]): boolean {
    if (
      user.type === UserType.ADMIN ||
      !validStatus ||
      validStatus.length === 0
    )
      return true;

    for (const status of validStatus) {
      if ((user as Investor).status && (user as Investor).status === status)
        return true;
    }
    return false;
  }
}
