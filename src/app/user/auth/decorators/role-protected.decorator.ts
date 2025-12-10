import { SetMetadata } from '@nestjs/common';
import { UserType } from '../../common/enums/user-type.enum';
import { InvestorType } from '../../investor/enums/investor-type.enum';

export const META_ROLES = 'roles';

export const RoleProtected = (roles: (UserType | InvestorType)[]) =>
  SetMetadata(META_ROLES, roles);
