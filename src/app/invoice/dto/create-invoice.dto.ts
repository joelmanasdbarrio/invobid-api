import { IsDate, IsNumber, IsPositive, IsUUID } from 'class-validator';

export class CreateInvoiceDto {
  @IsUUID()
  sellerInvestorId: string;

  @IsUUID()
  debtorId: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsDate()
  dueDate: Date;

  @IsNumber()
  @IsPositive()
  transactionFeeSellerPercentage: number;

  @IsNumber()
  @IsPositive()
  transactionFeeBuyerPercentage: number;
}
