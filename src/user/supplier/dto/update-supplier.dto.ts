import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsIn, IsUUID } from 'class-validator';
import { SupplierStatus } from '../enums/supplier-status.enum';
import { CreateSupplierDto } from './create-supplier.dto';

export class UpdateSupplierDto extends PartialType(CreateSupplierDto) {
  @IsBoolean()
  isActive: boolean;

  @IsIn(Object.values(SupplierStatus))
  status: string;

  @IsBoolean()
  isOptedInNotificationsEmail: boolean;

  @IsBoolean()
  isOptedInNotificationsSMS: boolean;

  @IsUUID()
  bankAccountId: string;
}
