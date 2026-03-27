import { PartialType } from '@nestjs/mapped-types';
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';
import { InvoiceStatus } from '../enums/invoice-status.enum';
import { CreateInvoiceDto } from './create-invoice.dto';

export class UpdateInvoiceDto extends PartialType(CreateInvoiceDto) {
  @IsUUID()
  @IsOptional()
  buyerInvestorId?: string;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  rating?: number;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  extRating?: number;

  @IsOptional()
  @IsIn(Object.values(InvoiceStatus))
  status?: InvoiceStatus;

  @IsOptional()
  @IsString()
  lastCommunication?: string;
}
