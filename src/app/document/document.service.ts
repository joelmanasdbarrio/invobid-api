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
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { Document } from './entities/document.entity';
import type { IStorageService } from './interfaces/storage.interface';

@Injectable()
export class DocumentService {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    @Inject('STORAGE_SERVICE')
    private readonly storageService: IStorageService,
  ) {}

  async create(
    createDocumentDto: CreateDocumentDto,
    file: Express.Multer.File,
  ) {
    try {
      const id = uuidv4();

      const document = this.documentRepository.create({
        id,
        title: createDocumentDto.title,
      });

      const storedFile = await this.storageService.uploadFile(file.buffer, id);

      if (!storedFile)
        throw new InternalServerErrorException('File upload failed');

      return this.documentRepository.save(document);
    } catch (error) {
      throw new InternalServerErrorException(
        error,
        'Could not create document',
      );
    }
  }

  findAll() {
    return this.documentRepository.find();
  }

  async findOne(id: string) {
    const document = await this.documentRepository.findOne({ where: { id } });
    if (!document)
      throw new NotFoundException(`Document with ID '${id}' not found`);

    return document;
  }

  async update(id: string, updateDocumentDto: UpdateDocumentDto) {
    const document = await this.documentRepository.findOne({ where: { id } });

    if (!document)
      throw new NotFoundException(`Document with ID '${id}' not found`);

    await this.documentRepository.update(id, updateDocumentDto);

    return { ...document, ...updateDocumentDto.removeUndefined() };
  }

  async remove(id: string) {
    const document = await this.documentRepository.findOne({ where: { id } });

    if (!document) {
      throw new NotFoundException();
    }

    await this.documentRepository.softDelete(id);
  }
}
