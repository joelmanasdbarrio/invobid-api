import { IsDateString, IsNumber, IsPositive, IsUUID } from 'class-validator';

export class CreateAuctionDto {
  @IsUUID()
  svc: string;

  @IsNumber()
  @IsPositive()
  startingPrice: number;

  @IsDateString()
  auctionDateEnd: string;
}
