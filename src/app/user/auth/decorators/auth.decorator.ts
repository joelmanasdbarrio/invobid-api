import { applyDecorators, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserType } from '../../common/enums/user-type.enum';
import { InvestorType } from '../../investor/enums/investor-type.enum';
import { UserRoleGuard } from '../guards/user-role.guard';
import { RoleProtected } from './role-protected.decorator';

export function Auth(roles: (UserType | InvestorType)[] = []) {
  return applyDecorators(
    RoleProtected(roles),
    UseGuards(AuthGuard('jwt'), UserRoleGuard),
  );
}
