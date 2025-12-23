import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import { DocumentType } from 'src/app/document/enums/document-type.enum';

export class CreateDocumentDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  value: string;

  @IsIn(Object.values(DocumentType))
  type: DocumentType;
}
