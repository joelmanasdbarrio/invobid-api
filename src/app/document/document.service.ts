import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Debtor } from 'src/app/debtor/entities/debtor.entity';
import { GetDocumentsDto } from 'src/app/document/dto/get-documents.dto';
import { Invoice } from 'src/app/invoice/entities/invoice.entity';
import { Not, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../user/common/entities/user.entity';
import { UserType } from '../user/common/enums/user-type.enum';
import { Investor } from '../user/investor/entities/investor.entity';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { Document } from './entities/document.entity';
import { type IStorageService } from './interfaces/storage.interface';

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
    user: User,
    debtor?: Debtor,
    invoice?: Invoice,
  ): Promise<Document> {
    if (!file) {
      throw new BadRequestException('file must be a valid Document');
    }

    if (
      await this.checkDuplicateDocumentValues(user.id, createDocumentDto.value)
    ) {
      throw new BadRequestException(
        `Document with value '${createDocumentDto.value}' already exists`,
      );
    }

    let document: Document | undefined;
    let documentPath: string | undefined;
    try {
      const documentId = uuidv4();

      document = this.documentRepository.create({
        ...createDocumentDto,
        filename: this.getFilename(file, documentId),
        id: documentId,
        investor: user as Investor,
        debtor: debtor,
        invoice: invoice,
        type: createDocumentDto.type,
      });

      documentPath = await this.uploadFile(file, documentId);

      return await this.documentRepository.save(document);
    } catch (error) {
      console.error(error);
      if (document) {
        await this.remove(document.id, user, false);
      }
      if (documentPath) {
        await this.deleteFile(documentPath);
      }

      throw new InternalServerErrorException(
        error,
        'Could not create document',
      );
    }
  }

  private async uploadFile(
    file: Express.Multer.File,
    documentId: string,
  ): Promise<string | undefined> {
    const storedFile = await this.documentStorageService.uploadFile(
      file.buffer,
      this.getFilename(file, documentId),
    );

    if (!storedFile)
      throw new InternalServerErrorException('File upload failed');

    return storedFile;
  }

  async findAll(query: GetDocumentsDto, user: User) {
    const queryBuilder = this.documentRepository
      .createQueryBuilder('document')
      .leftJoinAndSelect('document.investor', 'investor')
      .leftJoinAndSelect('document.debtor', 'debtor');

    if (user.type !== UserType.ADMIN) {
      queryBuilder.where('document.investorId = :investorId', {
        investorId: user.id,
      });
    } else {
      if (query.investorId) {
        queryBuilder.andWhere('document.investorId = :investorId', {
          investorId: query.investorId,
        });
      }
    }

    if (query.invoiceId) {
      queryBuilder.andWhere('document.invoiceId = :invoiceId', {
        invoiceId: query.invoiceId,
      });
    }

    if (query.debtorId) {
      queryBuilder.andWhere('document.debtorId = :debtorId', {
        debtorId: query.debtorId,
      });
    }

    if (query.title) {
      queryBuilder.andWhere('document.title LIKE :title', {
        title: `%${query.title}%`,
      });
    }

    if (query.filename) {
      queryBuilder.andWhere('document.filename LIKE :filename', {
        filename: `%${query.filename}%`,
      });
    }

    if (query.value) {
      queryBuilder.andWhere('document.value LIKE :value', {
        value: `%${query.value}%`,
      });
    }

    if (query.type) {
      queryBuilder.andWhere('document.type = :type', {
        type: query.type,
      });
    }

    const total = await queryBuilder.getCount();

    if (query.page && query.limit) {
      const skip = (query.page - 1) * query.limit;
      queryBuilder.skip(skip).take(query.limit);
    }

    queryBuilder.orderBy({
      'document.createdAt': 'DESC',
    });

    const data = await queryBuilder.getMany();

    return { data, total, page: query.page, limit: query.limit };
  }

  async findOne(id: string, user: User): Promise<Document> {
    const document =
      user.type === UserType.ADMIN
        ? await this.documentRepository.findOne({
            where: { id },
            relations: ['investor', 'debtor'],
          })
        : await this.documentRepository.findOne({
            where: { id, investor: { id: user.id } },
            relations: ['investor', 'debtor'],
          });

    if (!document)
      throw new NotFoundException(`Document with ID '${id}' not found`);

    return document;
  }

  async downloadOne(
    id: string,
    user: User,
  ): Promise<{ buffer: Buffer; document: Document }> {
    const document = await this.findOne(id, user);

    const fileBuffer = await this.documentStorageService.getFile(
      document.filename,
    );

    if (!fileBuffer)
      throw new NotFoundException(
        `File for document with ID '${id}' not found`,
      );

    return { buffer: fileBuffer, document };
  }

  async update(
    id: string,
    updateDocumentDto: UpdateDocumentDto,
    user: User,
  ): Promise<Document> {
    const document = await this.findOne(id, user);

    await this.documentRepository.update(id, updateDocumentDto);

    return { ...document, ...updateDocumentDto.removeUndefined() };
  }

  async remove(id: string, user: User, useSoft = true): Promise<void> {
    await this.findOne(id, user);

    if (useSoft) {
      await this.documentRepository.softDelete(id);
    } else {
      await this.documentRepository.delete(id);
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    return this.documentStorageService.deleteFile(filePath);
  }

  private getFilename(file: Express.Multer.File, documentId: string) {
    return `${documentId}.${file.originalname.split('.').pop()}`;
  }

  private async checkDuplicateDocumentValues(
    investorId: string,
    value: string,
  ): Promise<boolean> {
    const existingDocuments = await this.documentRepository.count({
      where: { value, investor: { id: Not(investorId) } },
    });
    return !!existingDocuments;
  }
}
