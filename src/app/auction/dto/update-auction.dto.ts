import { PartialType } from '@nestjs/mapped-types';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { AuctionStatus } from '../enum/auction-status.enum';
import { CreateAuctionDto } from './create-auction.dto';

export class UpdateAuctionDto extends PartialType(CreateAuctionDto) {
  @IsOptional()
  @IsIn(Object.values(AuctionStatus))
  status: AuctionStatus;

  @IsOptional()
  @IsString()
  lastCommunication?: string;
}
