import { IsNumber, IsPositive, IsUUID } from 'class-validator';

export class CreateBidDto {
  @IsUUID()
  auctionId: string;

  @IsUUID()
  investorId: string;

  @IsNumber()
  @IsPositive()
  amount: number;
}
