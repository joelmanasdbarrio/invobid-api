import {
  IsEmail,
  IsIn,
  IsPhoneNumber,
  IsString,
  MinLength,
} from 'class-validator';
import { IsCifNif } from 'src/validations/is-nif-cif.validator';
import { InvestorType } from '../enums/investor-type.enum';

export class CreateInvestorDto {
  @IsIn(Object.values(InvestorType))
  investorType: InvestorType;

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
}
