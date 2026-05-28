import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { User } from 'src/app/user/common/entities/user.entity';
import { Investor } from '../../investor/entities/investor.entity';
import { META_ROLES, META_STATUS } from '../decorators/user-role.decorator';
import { UserType } from 'src/app/user/common/enums/user-type.enum';
import { InvestorType } from 'src/app/user/investor/enums/investor-type.enum';
import { InvestorStatus } from 'src/app/user/investor/enums/investor-status.enum';

@Injectable()
export class UserRoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(
    ctx: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
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

    /* eslint-disable @typescript-eslint/no-unsafe-assignment */
    /* eslint-disable @typescript-eslint/no-unsafe-member-access */
    const req = ctx.switchToHttp().getRequest();
    const user = req.user as User;

    if (!user)
      throw new InternalServerErrorException('User not found in request');

    const hasValidRole = this.checkValidRole(user, validRoles);
    const hasValidStatus = this.checkValidStatus(user, validStatus);

    if (hasValidRole && hasValidStatus) return true;

    throw new ForbiddenException(
      "You don't have permissions to perform this action",
    );
  }

  private checkValidRole(
    user: User,
    validRoles: (UserType | InvestorType)[],
  ): boolean {
    if (validRoles.length === 0) return true;

    for (const role of validRoles) {
      if (user.type === role) {
        return true;
      } else if (
        (user as Investor).investorType &&
        (user as Investor).investorType === role
      ) {
        return true;
      }
    }
    return false;
  }

  private checkValidStatus(user: User, validStatus: InvestorStatus[]): boolean {
    if (user.type === UserType.ADMIN || validStatus.length === 0) return true;

    for (const status of validStatus) {
      if ((user as Investor).status && (user as Investor).status === status) {
        return true;
      }
    }
    return false;
  }
}
