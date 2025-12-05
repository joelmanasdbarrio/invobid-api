import { IsNumber, IsPositive, IsUUID } from 'class-validator';

export class CreateBidDto {
  @IsUUID()
  auctionId: string;

  @IsNumber()
  @IsPositive()
  amount: number;
}
