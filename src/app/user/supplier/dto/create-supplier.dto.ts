import {
  IsEmail,
  IsPhoneNumber,
  IsString,
  IsUrl,
  MinLength,
} from 'class-validator';
import { IsCifNif } from 'src/validations/is-nif-cif.validator';

export class CreateSupplierDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  companyName: string;

  @IsEmail()
  email: string;

  @IsPhoneNumber('ES')
  phoneNumber: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @MinLength(6)
  passwordRepeat: string;

  @IsCifNif()
  documentValue: string;

  @IsUrl()
  website: string;
}
