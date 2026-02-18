import {
  IsDate,
  IsNumber,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateInvoiceDto {
  @IsUUID()
  debtorId: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsDate()
  dueDate: Date;

  /**
   * Identificador del Registro de Facturación:
   * NIF/CIF/DNI del emisor + Serie + Número factura + Fecha + Código de verificación
   * [ID Emisor]-[Serie]-[Número]-[Fecha]-[CódigoVerificación]
   * B12345678-F001-00001234-20260216-A9K3
   */
  @IsString()
  invoiceId: string;
}
