import {
  IsIn,
  IsNumber,
  IsOptional,
  IsPositive,
  IsUUID,
} from 'class-validator';
import { InvoiceStatus } from 'src/app/invoice/enums/invoice-status.enum';
import { PaginationDto } from 'src/dto/pagination.dto';

export class GetInvoicesDto extends PaginationDto {
  @IsUUID()
  @IsOptional()
  sellerInvestorId?: string;

  @IsUUID()
  @IsOptional()
  buyerInvestorId?: string;

  @IsUUID()
  @IsOptional()
  debtorId?: string;

  @IsIn(Object.values(InvoiceStatus))
  @IsOptional()
  status?: InvoiceStatus;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  maxAmount?: number;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  minAmount?: number;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  minRating?: number;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  maxTransactionFeeSellerPercentage?: number;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  minTransactionFeeSellerPercentage?: number;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  maxTransactionFeeBuyerPercentage?: number;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  minTransactionFeeBuyerPercentage?: number;
}
