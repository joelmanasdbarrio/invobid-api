import { PartialType } from '@nestjs/mapped-types';
import { CreateDebtorDto } from './create-debtor.dto';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { DebtorStatus } from 'src/app/debtor/enums/debtor-status.enum';

export class UpdateDebtorDto extends PartialType(CreateDebtorDto) {
  @IsOptional()
  @IsIn(Object.values(DebtorStatus))
  status?: DebtorStatus;

  @IsOptional()
  @IsString()
  lastCommunication?: string;
}
