import { PartialType } from '@nestjs/mapped-types';
import { IsObject, IsOptional, IsString } from 'class-validator';
import { CreateDocumentDto } from './create-document.dto';

export class UpdateDocumentDto extends PartialType(CreateDocumentDto) {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsObject()
  value?: object;
}
