import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { GetDocumentsDto } from 'src/app/document/dto/get-documents.dto';
import { FileTypePipe } from 'src/pipes/file-type.pipe';
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

    return {
      status: 'success',
      data: document,
    };
  }

  @Get()
  @Auth()
  async findAll(@Query() query: GetDocumentsDto, @GetUser() user: User) {
    const { data, total, page, limit } = await this.documentService.findAll(
      {
        ...query,
        page: query.page || 1,
        limit: query.limit || 10,
      },
      user,
    );

    return {
      status: 'success',
      data,
      _metadata: {
        total,
        length: data.length,
        page,
        limit,
      },
    };
  }

  @Get(':id')
  @Auth()
  findOne(@Param('id', ParseUUIDPipe) id: string, @GetUser() user: User) {
    return this.documentService.findOne(id, user);
  }

  @Get(':id/download')
  @Auth()
  async downloadOne(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: User,
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.documentService.downloadOne(id, user);
    const buffer = result.buffer;
    const doc = result.document;

    const parts = doc.filename.split('.');
    const extension = parts.length > 0 ? parts[parts.length - 1] : '';
    const mimetypeMap: Record<string, string> = {
      pdf: 'application/pdf',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
    };
    const mimetype =
      (mimetypeMap[extension.toLowerCase()] as string | undefined) ||
      'application/octet-stream';

    res.setHeader('Content-Type', mimetype);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${doc.title}.${extension}"`,
    );
    res.setHeader('Content-Length', String(buffer.length));

    res.send(buffer);
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
