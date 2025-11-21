import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsIn, IsOptional } from 'class-validator';
import { SupplierStatus } from '../enums/supplier-status.enum';
import { CreateSupplierDto } from './create-supplier.dto';

export class UpdateSupplierDto extends PartialType(CreateSupplierDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsIn(Object.values(SupplierStatus))
  status?: SupplierStatus;

  @IsOptional()
  @IsBoolean()
  isOptedInNotificationsEmail?: boolean;

  @IsOptional()
  @IsBoolean()
  isOptedInNotificationsSMS?: boolean;
}
