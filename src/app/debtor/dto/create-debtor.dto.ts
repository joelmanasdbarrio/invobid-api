import { IsEmail, IsPhoneNumber, IsString } from 'class-validator';
import { IsCifNif } from 'src/validations/is-nif-cif.validator';

export class CreateDebtorDto {
  @IsEmail()
  email: string;

  @IsPhoneNumber('ES')
  phoneNumber: string;

  @IsString()
  companyName: string;

  @IsCifNif()
  taxId: string;

  // @IsString()
  // modelo111QuarterlyCsv: string;

  // @IsString()
  // modelo111AnnualCsv: string;

  // @IsString()
  // modelo303QuarterlyCsv: string;

  // @IsString()
  // modelo303AnnualCsv: string;
}
