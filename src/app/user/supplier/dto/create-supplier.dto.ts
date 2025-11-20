import { IsEmail, IsPhoneNumber, IsString } from 'class-validator';

export class CreateSupplierDto {
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

  @IsString()
  documentId: string;
}
