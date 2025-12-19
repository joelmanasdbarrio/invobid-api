import { IsIn, IsOptional, IsPhoneNumber, IsString } from 'class-validator';
import { InvestorType } from 'src/app/user/investor/enums/investor-type.enum';
import { IsCifNif } from 'src/validations/is-nif-cif.validator';
import { InvestorStatus } from 'src/app/user/investor/enums/investor-status.enum';
import { PaginationDto } from 'src/dto/pagination.dto';

export class GetInvestorsDto extends PaginationDto {
  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  companyName?: string;

  @IsPhoneNumber('ES')
  @IsOptional()
  phoneNumber?: string;

  @IsCifNif()
  @IsOptional()
  documentValue?: string;

  @IsIn(Object.values(InvestorType))
  @IsOptional()
  investorType?: InvestorType;

  @IsOptional()
  @IsIn(Object.values(InvestorStatus))
  status?: InvestorStatus;
}
