import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';
import { Currency } from '../enums/currency.enum';

export class CreateInvoiceDto {
  @IsUUID()
  debtorId: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  @IsDateString()
  dueDate: string;

  /**
   * Identificador del Registro de Facturación:
   * NIF/CIF/DNI del emisor + Serie + Número factura + Fecha + Código de verificación
   * [ID Emisor]-[Serie]-[Número]-[Fecha]-[CódigoVerificación]
   * B12345678-F001-00001234-20260216-A9K3
   */
  @IsString()
  invoiceUid: string;
}
