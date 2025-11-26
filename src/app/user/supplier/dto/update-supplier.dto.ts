import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsIn, IsOptional, IsUrl } from 'class-validator';
import { IsCifNif } from 'src/validations/is-nif-cif.validator';
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
  @IsUrl()
  website?: string;

  @IsOptional()
  @IsCifNif()
  documentValue: string;

  @IsOptional()
  @IsBoolean()
  isOptedInNotificationsEmail?: boolean;

  @IsOptional()
  @IsBoolean()
  isOptedInNotificationsSMS?: boolean;
}
