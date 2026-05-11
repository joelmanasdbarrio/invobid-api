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
import { PaginationDto } from 'src/dto/pagination.dto';
import { AuctionStatus } from '../enums/auction-status.enum';

export class GetAuctionsDto extends PaginationDto {
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
  minDiscount?: number;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  minProfitability?: number;

  @IsDateString()
  @IsOptional()
  auctionDateStart?: string;

  @IsDateString()
  @IsOptional()
  auctionDateEnd?: string;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  minRating?: number;

  @IsIn(Object.values(AuctionStatus))
  @IsOptional()
  status?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  hasBidded?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  includeDeleted?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  includeSelf?: number;
}
