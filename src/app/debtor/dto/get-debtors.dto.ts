import {
  IsEmail,
  IsIn,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsUUID,
} from 'class-validator';
import { IsCifNif } from 'src/validations/is-nif-cif.validator';
import { PaginationDto } from 'src/dto/pagination.dto';
import { DebtorStatus } from 'src/app/debtor/enums/debtor-status.enum';

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
  @IsIn(Object.values(DebtorStatus))
  status?: DebtorStatus;

  @IsOptional()
  @IsUUID()
  investorId?: string;
}
