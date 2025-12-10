import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileTypePipe } from '../../pipes/file-type.pipe';
import { Auth } from '../user/auth/decorators/auth.decorator';
import { GetUser } from '../user/auth/decorators/get-user.decorator';
import { User } from '../user/common/entities/user.entity';
import { UserType } from '../user/common/enums/user-type.enum';
import { DocumentService } from './document.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';

@Controller('documents')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Post()
  @Auth([UserType.INVESTOR])
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @Body() createDocumentDto: CreateDocumentDto,
    @UploadedFile(FileTypePipe) file: Express.Multer.File,
    @GetUser() user: User,
  ) {
    const document = await this.documentService.create(
      createDocumentDto,
      file,
      user,
    );
    const storedFile = await this.documentService.uploadFile(file, document.id);
    return { ...document, file: storedFile };
  }

  @Get()
  @Auth()
  findAll(@GetUser() user: User) {
    return this.documentService.findAll(user);
  }

  @Get(':id')
  @Auth()
  findOne(@Param('id', ParseUUIDPipe) id: string, @GetUser() user: User) {
    return this.documentService.findOne(id, user);
  }

  @Patch(':id')
  @Auth()
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDocumentDto: UpdateDocumentDto,
    @GetUser() user: User,
  ) {
    return this.documentService.update(id, updateDocumentDto, user);
  }

  @Delete(':id')
  @Auth([UserType.ADMIN])
  remove(@Param('id', ParseUUIDPipe) id: string, @GetUser() user: User) {
    return this.documentService.remove(id, user);
  }
}
