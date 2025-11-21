import {
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { type IStorageService } from '../../storage/interfaces/storage.interface';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { Document } from './entities/document.entity';

@Injectable()
export class DocumentService {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    @Inject('STORAGE_SERVICE')
    private readonly documentStorageService: IStorageService,
  ) {}

  async create(
    createDocumentDto: CreateDocumentDto,
    file: Express.Multer.File,
  ): Promise<Document> {
    try {
      const documentId = uuidv4();

      const document = this.documentRepository.create({
        ...createDocumentDto,
        filename: this.getFilename(file, documentId),
        id: documentId,
      });

      return await this.documentRepository.save(document);
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException(
        error,
        'Could not create document',
      );
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    documentId: string,
  ): Promise<string | null> {
    const storedFile = await this.documentStorageService.uploadFile(
      file,
      this.getFilename(file, documentId),
    );

    if (!storedFile)
      throw new InternalServerErrorException('File upload failed');

    return storedFile;
  }

  findAll(): Promise<Document[]> {
    return this.documentRepository.find();
  }

  async findOne(id: string): Promise<Document> {
    const document = await this.documentRepository.findOne({ where: { id } });

    if (!document)
      throw new NotFoundException(`Document with ID '${id}' not found`);

    return document;
  }

  async update(
    id: string,
    updateDocumentDto: UpdateDocumentDto,
  ): Promise<Document> {
    const document = await this.findOne(id);

    await this.documentRepository.update(id, updateDocumentDto);

    return { ...document, ...updateDocumentDto.removeUndefined() };
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);

    await this.documentRepository.softDelete(id);
  }

  async deleteFile(filePath: string): Promise<void> {
    return this.documentStorageService.deleteFile(filePath);
  }

  private getFilename(file: Express.Multer.File, documentId: string) {
    return `${documentId}.${file.originalname.split('.').pop()}`;
  }
}
