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
  supplierId: string;

  @IsUUID()
  @IsOptional()
  investorId: string;

  @IsUUID()
  documentId: string;

  @IsString()
  debtorId: string;

  @IsString()
  debtorCompanyName: string;

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
  supplierTransactionFeePercentage: number;

  @IsNumber()
  @IsPositive()
  investorTransactionFeePercentage: number;

  @IsNumber()
  @IsPositive()
  rating: number;
}
