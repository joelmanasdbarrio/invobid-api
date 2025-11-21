import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsIn, IsOptional } from 'class-validator';
import { InvestorStatus } from '../enums/investor-status.enum';
import { CreateInvestorDto } from './create-investor.dto';

export class UpdateInvestorDto extends PartialType(CreateInvestorDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsIn(Object.values(InvestorStatus))
  status?: string;

  @IsOptional()
  @IsBoolean()
  isOptedInNotificationsEmail?: boolean;

  @IsOptional()
  @IsBoolean()
  isOptedInNotificationsSMS?: boolean;
}
