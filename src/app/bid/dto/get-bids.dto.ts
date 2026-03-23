import { IsOptional, IsUUID } from 'class-validator';
import { PaginationDto } from 'src/dto/pagination.dto';

export class GetBidsDto extends PaginationDto {
  @IsUUID()
  @IsOptional()
  auctionId?: string;

  @IsUUID()
  @IsOptional()
  investorId?: string;
}
