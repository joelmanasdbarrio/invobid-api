import { IsDate, IsNumber, IsPositive, IsUUID } from 'class-validator';

export class CreateInvoiceDto {
  @IsUUID()
  debtorId: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsDate()
  dueDate: Date;
}
