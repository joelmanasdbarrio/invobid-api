import {
  IsEmail,
  IsIn,
  IsPhoneNumber,
  IsString,
  MinLength,
} from 'class-validator';
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

  @IsIn(Object.values(InvestorType))
  investorType: string;

  @IsString()
  documentId: string;
}
