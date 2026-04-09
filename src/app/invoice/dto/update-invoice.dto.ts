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

  /**
   * Identificador del Registro de Facturación:
   * NIF/CIF/DNI del emisor + Serie + Número factura + Fecha + Código de verificación
   * [ID Emisor]-[Serie]-[Número]-[Fecha]-[CódigoVerificación]
   * B12345678-F001-00001234-20260216-A9K3
   */
  @IsString()
  @IsOptional()
  svc?: string;

  @IsOptional()
  @IsIn(Object.values(InvoiceStatus))
  status?: InvoiceStatus;

  @IsOptional()
  @IsString()
  lastCommunication?: string;
}
