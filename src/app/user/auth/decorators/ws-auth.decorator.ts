import { applyDecorators, UseGuards } from '@nestjs/common';
import { UserType } from '../../common/enums/user-type.enum';
import { InvestorStatus } from '../../investor/enums/investor-status.enum';
import { InvestorType } from '../../investor/enums/investor-type.enum';
import { WsJwtGuard } from '../guards/ws-jwt.guard';
import { WsUserRoleGuard } from '../guards/ws-user-role.guard';
import { UserRole } from './user-role.decorator';

export function WsAuth(
  roles: (UserType | InvestorType)[] = [],
  status: InvestorStatus[] = [InvestorStatus.VERIFIED],
) {
  return applyDecorators(
    UserRole(roles, status),
    UseGuards(WsJwtGuard, WsUserRoleGuard),
  );
}
