import { PartialType } from '@nestjs/mapped-types';
import { IsIn } from 'class-validator';
import { AuctionStatus } from '../enum/auction-status.enum';
import { CreateAuctionDto } from './create-auction.dto';

export class UpdateAuctionDto extends PartialType(CreateAuctionDto) {
  @IsIn(Object.values(AuctionStatus))
  status: string;
}
