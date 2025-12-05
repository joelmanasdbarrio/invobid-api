import {
  IsDate,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateInvoiceDto {
  @IsUUID()
  documentId: string;

  @IsString()
  debtorId: string;

  @IsString()
  debtorcompanyName: string;

  @IsString()
  @IsOptional()
  debtorWebsite: string;

  @IsString()
  @IsOptional()
  debtorEmail: string;

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

  @IsNumber()
  @IsPositive()
  rating: number;
}
