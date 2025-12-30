import { PaginationDto } from 'src/dto/pagination.dto';
import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { DocumentType } from 'src/app/document/enums/document-type.enum';

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

  @IsUUID()
  @IsOptional()
  investorId?: string;
}
