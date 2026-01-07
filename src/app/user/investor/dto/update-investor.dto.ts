import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';
import { InvestorStatus } from '../enums/investor-status.enum';
import { CreateInvestorDto } from './create-investor.dto';

export class UpdateInvestorDto extends PartialType(CreateInvestorDto) {
  @IsOptional()
  @IsIn(Object.values(InvestorStatus))
  status?: InvestorStatus;

  @IsOptional()
  @IsString()
  lastCommunication?: string;

  @IsOptional()
  @IsBoolean()
  isOptedInNotificationsEmail?: boolean;

  @IsOptional()
  @IsBoolean()
  isOptedInNotificationsSMS?: boolean;
}
