import {
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { InvoiceStatus } from 'src/app/invoice/enums/invoice-status.enum';
import { PaginationDto } from 'src/dto/pagination.dto';

export class GetInvoicesDto extends PaginationDto {
  @IsString()
  @IsOptional()
  invoiceSvc?: string;

  @IsString()
  @IsOptional()
  sellerInvestorId?: string;

  @IsString()
  @IsOptional()
  sellerCompanyName?: string;

  @IsString()
  @IsOptional()
  buyerInvestorId?: string;

  @IsString()
  @IsOptional()
  buyerCompanyName?: string;

  @IsString()
  @IsOptional()
  debtorId?: string;

  @IsString()
  @IsOptional()
  debtorCompanyName?: string;

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

  @IsDateString()
  @IsOptional()
  dueDateFrom?: string;

  @IsDateString()
  @IsOptional()
  dueDateTo?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  isSold?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  includeDeleted?: number;
}
