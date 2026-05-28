import {
  IsIn,
  IsNumber,
  IsOptional,
  IsPhoneNumber,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { InvestorStatus } from 'src/app/user/investor/enums/investor-status.enum';
import { InvestorType } from 'src/app/user/investor/enums/investor-type.enum';
import { PaginationDto } from 'src/dto/pagination.dto';
import { IsCifNif } from 'src/validations/is-nif-cif.validator';

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
  taxId?: string;

  @IsIn(Object.values(InvestorType))
  @IsOptional()
  investorType?: InvestorType;

  @IsOptional()
  @IsIn(Object.values(InvestorStatus))
  status?: InvestorStatus;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  includeDeleted?: number;
}
