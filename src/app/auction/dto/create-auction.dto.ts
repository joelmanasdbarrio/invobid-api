import {
  IsDate,
  IsNumber,
  IsOptional,
  IsPositive,
  IsUUID,
} from 'class-validator';

export class CreateAuctionDto {
  @IsUUID()
  invoiceId: string;

  @IsNumber()
  @IsPositive()
  discountRate: number;

  @IsDate()
  @IsOptional()
  auctionDate?: Date;

  @IsDate()
  @IsOptional()
  dueDate?: Date;
}
