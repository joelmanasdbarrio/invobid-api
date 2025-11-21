import { IsEmail, IsPhoneNumber, IsString, MinLength } from 'class-validator';

export class CreateSupplierDto {
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
  @MinLength(2)
  companyName: string;
}
