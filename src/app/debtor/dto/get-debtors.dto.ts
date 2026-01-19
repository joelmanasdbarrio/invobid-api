import { IsEmail, IsOptional, IsPhoneNumber, IsString } from 'class-validator';
import { IsCifNif } from 'src/validations/is-nif-cif.validator';
import { PaginationDto } from 'src/dto/pagination.dto';

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
}
