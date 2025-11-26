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
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @MinLength(2)
  name: string;

  @IsPhoneNumber('ES')
  phoneNumber: string;

  @IsString()
  companyName: string;

  @IsCifNif()
  documentValue: string;

  @IsIn(Object.values(InvestorType))
  investorType: InvestorType;
}
