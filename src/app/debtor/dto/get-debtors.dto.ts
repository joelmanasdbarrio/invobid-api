import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsUUID,
} from 'class-validator';
import { DebtorStatus } from 'src/app/debtor/enums/debtor-status.enum';
import { PaginationDto } from 'src/dto/pagination.dto';
import { IsCifNif } from 'src/validations/is-nif-cif.validator';
import { Transform } from 'class-transformer';

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
  @IsUUID()
  investorId?: string;

  @IsOptional()
  @IsIn(Object.values(DebtorStatus))
  status?: DebtorStatus;

  @IsOptional()
  @IsBoolean()
  includeDeleted?: boolean;
}
