import {
  IsEmail,
  IsIn,
  IsNumber,
  IsOptional,
  IsPhoneNumber,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { DebtorStatus } from 'src/app/debtor/enums/debtor-status.enum';
import { PaginationDto } from 'src/dto/pagination.dto';
import { IsCifNif } from 'src/validations/is-nif-cif.validator';

export class GetDebtorsDto extends PaginationDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsPhoneNumber('ES')
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsCifNif()
  taxId?: string;

  @IsOptional()
  @IsString()
  investorId?: string;

  @IsOptional()
  @IsIn(Object.values(DebtorStatus))
  status?: DebtorStatus;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  includeDeleted?: number;
}
