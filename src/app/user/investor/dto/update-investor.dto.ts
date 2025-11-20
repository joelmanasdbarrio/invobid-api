import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsIn, IsUUID } from 'class-validator';
import { InvestorStatus } from '../enums/investor-status.enum';
import { CreateInvestorDto } from './create-investor.dto';

export class UpdateInvestorDto extends PartialType(CreateInvestorDto) {
  @IsBoolean()
  isActive: boolean;

  @IsIn(Object.values(InvestorStatus))
  status: string;

  @IsBoolean()
  isOptedInNotificationsEmail: boolean;

  @IsBoolean()
  isOptedInNotificationsSMS: boolean;

  @IsUUID()
  bankAccountId: string;
}
