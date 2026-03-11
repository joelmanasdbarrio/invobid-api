import { IsIn, IsOptional, IsString } from 'class-validator';
import { DocumentType } from 'src/app/document/enums/document-type.enum';
import { PaginationDto } from 'src/dto/pagination.dto';

export class GetDocumentsDto extends PaginationDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  filename?: string;

  @IsString()
  @IsOptional()
  value?: string;

  @IsIn(Object.values(DocumentType))
  @IsOptional()
  type?: DocumentType;

  @IsString()
  @IsOptional()
  investorId?: string;

  @IsString()
  @IsOptional()
  debtorId?: string;

  @IsString()
  @IsOptional()
  invoiceId?: string;
}
