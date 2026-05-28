import { applyDecorators, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserType } from '../../common/enums/user-type.enum';
import { InvestorType } from '../../investor/enums/investor-type.enum';
import { UserRoleGuard } from '../guards/user-role.guard';
import { UserRole } from './user-role.decorator';
import { InvestorStatus } from 'src/app/user/investor/enums/investor-status.enum';

export function Auth(
  roles: (UserType | InvestorType)[] = [],
  status: InvestorStatus[] = [InvestorStatus.VERIFIED],
) {
  return applyDecorators(
    UserRole(roles, status),
    UseGuards(AuthGuard('jwt'), UserRoleGuard),
  );
}
