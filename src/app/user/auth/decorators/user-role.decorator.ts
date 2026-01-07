import { applyDecorators, SetMetadata } from '@nestjs/common';
import { InvestorStatus } from 'src/app/user/investor/enums/investor-status.enum';
import { UserType } from '../../common/enums/user-type.enum';
import { InvestorType } from '../../investor/enums/investor-type.enum';

export const META_ROLES = 'roles';
export const META_STATUS = 'status';

export const UserRole = (
  roles: (UserType | InvestorType)[],
  status: InvestorStatus[],
) => {
  return applyDecorators(
    SetMetadata(META_ROLES, roles),
    SetMetadata(META_STATUS, status),
  );
};
