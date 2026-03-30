import { PartialType } from '@nestjs/mapped-types';
import { IsIn, IsOptional } from 'class-validator';
import { AuctionStatus } from '../enums/auction-status.enum';
import { CreateAuctionDto } from './create-auction.dto';

export class UpdateAuctionDto extends PartialType(CreateAuctionDto) {
  @IsOptional()
  @IsIn(Object.values(AuctionStatus))
  status: AuctionStatus;
}
