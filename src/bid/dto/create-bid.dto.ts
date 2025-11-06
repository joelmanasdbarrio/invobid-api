import { IsNumber, IsPositive, IsUUID } from 'class-validator';

export class CreateBidDto {
  @IsUUID()
  auctionId: number;

  @IsUUID()
  investorId: number;

  @IsNumber()
  @IsPositive()
  amount: number;
}
