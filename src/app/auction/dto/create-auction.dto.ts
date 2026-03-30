import { IsDateString, IsNumber, IsPositive, IsUUID } from 'class-validator';

export class CreateAuctionDto {
  @IsUUID()
  invoiceId: string;

  @IsNumber()
  @IsPositive()
  startingPrice: number;

  @IsDateString()
  auctionDateEnd: string;
}
