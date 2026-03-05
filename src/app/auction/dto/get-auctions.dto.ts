import {
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { PaginationDto } from 'src/dto/pagination.dto';
import { AuctionStatus } from '../enums/auction-status.enum';

export class GetAuctionsDto extends PaginationDto {
  @IsUUID()
  @IsOptional()
  invoiceId?: string;

  @IsUUID()
  @IsOptional()
  sellerInvestorId?: string;

  @IsString()
  @IsOptional()
  sellerCompanyName?: string;

  @IsUUID()
  @IsOptional()
  buyerInvestorId?: string;

  @IsString()
  @IsOptional()
  buyerCompanyName?: string;

  @IsUUID()
  @IsOptional()
  debtorId?: string;

  @IsString()
  @IsOptional()
  debtorCompanyName?: string;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  maxAmount?: number;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  minAmount?: number;

  @IsDateString()
  @IsOptional()
  auctionDateStart?: string;

  @IsDateString()
  @IsOptional()
  auctionDateEnd?: string;

  @IsIn(Object.values(AuctionStatus))
  @IsOptional()
  status?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  includeDeleted?: number;
}
