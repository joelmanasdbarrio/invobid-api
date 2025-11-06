import { IsEmail, IsIn, IsPhoneNumber, IsString } from 'class-validator';
import { InvestorType } from '../enums/investor-type.enum';

export class CreateInvestorDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsString()
  name: string;

  @IsPhoneNumber()
  phoneNumber: number;

  @IsString()
  companyName: string;

  @IsIn(Object.values(InvestorType))
  investorType: string;

  @IsString()
  documentId: string;
}
