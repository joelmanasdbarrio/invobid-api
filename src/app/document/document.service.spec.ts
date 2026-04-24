import {
    BadRequestException,
    NotFoundException,
    ServiceUnavailableException
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from 'src/app/user/common/entities/user.entity';
import { UserType } from 'src/app/user/common/enums/user-type.enum';
import { Investor } from 'src/app/user/investor/entities/investor.entity';
import 'src/utils/object.extensions';
import { DocumentService } from './document.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { GetDocumentsDto } from './dto/get-documents.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { Document } from './entities/document.entity';
import { DocumentType } from './enums/document-type.enum';

jest.mock('uuid', () => ({ v4: () => 'test-uuid' }));

const mockQueryBuilder = {
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  getCount: jest.fn().mockResolvedValue(0),
  getMany: jest.fn().mockResolvedValue([]),
};

const mockDocumentRepository = {
  create: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  softDelete: jest.fn(),
  delete: jest.fn(),
  count: jest.fn().mockResolvedValue(0),
  createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
};

const mockStorageService = {
  uploadFile: jest.fn(),
  getFile: jest.fn(),
  deleteFile: jest.fn(),
};

const mockConfigService = { get: jest.fn() };

const adminUser = { id: 'admin-id', type: UserType.ADMIN } as User;
const investorUser = {
  id: 'investor-id',
  type: UserType.INVESTOR,
} as User;

const makeDocument = (overrides: Partial<Document> = {}): Document =>
  ({
    id: 'doc-id',
    title: 'Test Document',
    filename: 'test-uuid.pdf',
    value: 'doc-value',
    type: DocumentType.INVOICE,
    investor: { id: 'investor-id' } as Investor,
    ...overrides,
  }) as Document;

const makeFile = (originalname = 'file.pdf'): Express.Multer.File =>
  ({
    originalname,
    buffer: Buffer.from('file-content'),
  }) as Express.Multer.File;

const makeCreateDto = (): CreateDocumentDto => ({
  title: 'Test Document',
  value: 'doc-value',
  type: DocumentType.INVOICE,
});

describe('DocumentService', () => {
  let service: DocumentService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockDocumentRepository.count.mockResolvedValue(0);
    mockQueryBuilder.getCount.mockResolvedValue(0);
    mockQueryBuilder.getMany.mockResolvedValue([]);
    mockDocumentRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentService,
        { provide: ConfigService, useValue: mockConfigService },
        {
          provide: getRepositoryToken(Document),
          useValue: mockDocumentRepository,
        },
        { provide: 'STORAGE_SERVICE', useValue: mockStorageService },
      ],
    }).compile();

    service = module.get<DocumentService>(DocumentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should throw BadRequestException when file is not provided', async () => {
      await expect(
        service.create(
          makeCreateDto(),
          undefined as unknown as Express.Multer.File,
          investorUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create document entity, upload file, save and return document', async () => {
      const document = makeDocument();
      mockStorageService.uploadFile.mockResolvedValue('test-uuid.pdf');
      mockDocumentRepository.save.mockResolvedValue(document);

      const result = await service.create(
        makeCreateDto(),
        makeFile(),
        investorUser,
      );

      expect(mockStorageService.uploadFile).toHaveBeenCalledWith(
        expect.any(Buffer),
        'test-uuid.pdf',
      );
      expect(mockDocumentRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-uuid',
          filename: 'test-uuid.pdf',
          type: DocumentType.INVOICE,
        }),
      );
      expect(result).toBe(document);
    });

    it('should rollback by calling deleteFile when save throws', async () => {
      mockStorageService.uploadFile.mockResolvedValue('test-uuid.pdf');
      mockDocumentRepository.save.mockRejectedValue(new Error('DB error'));

      await expect(
        service.create(makeCreateDto(), makeFile(), investorUser),
      ).rejects.toThrow(ServiceUnavailableException);

      expect(mockStorageService.deleteFile).toHaveBeenCalledWith(
        'test-uuid.pdf',
      );
    });

    it('should derive filename as <uuid>.<extension> from originalname', async () => {
      const document = makeDocument({ filename: 'test-uuid.png' });
      mockStorageService.uploadFile.mockResolvedValue('test-uuid.png');
      mockDocumentRepository.save.mockResolvedValue(document);

      await service.create(
        makeCreateDto(),
        makeFile('photo.png'),
        investorUser,
      );

      expect(mockDocumentRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ filename: 'test-uuid.png' }),
      );
    });
  });

  describe('findAll', () => {
    it('should apply investorId filter for non-ADMIN user', async () => {
      await service.findAll(
        { page: 1, limit: 10 } as GetDocumentsDto,
        investorUser,
      );

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'document.investorId = :investorId',
        { investorId: 'investor-id' },
      );
    });

    it('should NOT apply investorId filter for ADMIN user by default', async () => {
      await service.findAll(
        { page: 1, limit: 10 } as GetDocumentsDto,
        adminUser,
      );

      expect(mockQueryBuilder.where).not.toHaveBeenCalled();
    });

    it('should apply investorId andWhere for ADMIN when investorId query param is set', async () => {
      await service.findAll(
        { page: 1, limit: 10, investorId: 'some-investor' } as GetDocumentsDto,
        adminUser,
      );

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'investor.id = :investorId',
        { investorId: 'some-investor' },
      );
    });

    it('should apply skip/take and return data/total/page/limit', async () => {
      const documents = [makeDocument()];
      mockQueryBuilder.getCount.mockResolvedValue(1);
      mockQueryBuilder.getMany.mockResolvedValue(documents);

      const result = await service.findAll(
        { page: 2, limit: 5 } as GetDocumentsDto,
        adminUser,
      );

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(5);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(5);
      expect(result).toEqual({ data: documents, total: 1, page: 2, limit: 5 });
    });

    it('should always orderBy document.createdAt DESC', async () => {
      await service.findAll(
        { page: 1, limit: 10 } as GetDocumentsDto,
        adminUser,
      );

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith({
        'document.createdAt': 'DESC',
      });
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException when document is not found', async () => {
      mockDocumentRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('missing-id', adminUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should call findOne without investor filter for ADMIN', async () => {
      const document = makeDocument();
      mockDocumentRepository.findOne.mockResolvedValue(document);

      await service.findOne(document.id, adminUser);

      expect(mockDocumentRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: document.id } }),
      );
      const call = mockDocumentRepository.findOne.mock.calls[0][0] as {
        where: Record<string, unknown>;
      };
      expect(call.where).not.toHaveProperty('investor');
    });

    it('should call findOne with investor filter for non-ADMIN', async () => {
      const document = makeDocument();
      mockDocumentRepository.findOne.mockResolvedValue(document);

      await service.findOne(document.id, investorUser);

      expect(mockDocumentRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: document.id, investor: { id: investorUser.id } },
        }),
      );
    });
  });

  describe('downloadOne', () => {
    it('should call storageService.getFile with document.filename', async () => {
      const document = makeDocument({ filename: 'test-uuid.pdf' });
      mockDocumentRepository.findOne.mockResolvedValue(document);
      mockStorageService.getFile.mockResolvedValue(Buffer.from('content'));

      await service.downloadOne(document.id, adminUser);

      expect(mockStorageService.getFile).toHaveBeenCalledWith('test-uuid.pdf');
    });

    it('should throw NotFoundException when storageService.getFile returns falsy', async () => {
      const document = makeDocument();
      mockDocumentRepository.findOne.mockResolvedValue(document);
      mockStorageService.getFile.mockResolvedValue(null);

      await expect(service.downloadOne(document.id, adminUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return { buffer, document }', async () => {
      const document = makeDocument();
      const buffer = Buffer.from('file-content');
      mockDocumentRepository.findOne.mockResolvedValue(document);
      mockStorageService.getFile.mockResolvedValue(buffer);

      const result = await service.downloadOne(document.id, adminUser);

      expect(result).toEqual({ buffer, document });
    });
  });

  describe('update', () => {
    it('should call documentRepository.update and return merged document', async () => {
      const document = makeDocument();
      const dto: UpdateDocumentDto = { title: 'Updated Title' };
      mockDocumentRepository.findOne.mockResolvedValue(document);
      mockDocumentRepository.update.mockResolvedValue(undefined);

      const result = await service.update(document.id, dto, adminUser);

      expect(mockDocumentRepository.update).toHaveBeenCalledWith(
        document.id,
        dto,
      );
      expect(result.title).toBe('Updated Title');
    });

    it('should strip undefined fields from dto when merging', async () => {
      const document = makeDocument({ title: 'Original' });
      const dto: UpdateDocumentDto = { title: undefined };
      mockDocumentRepository.findOne.mockResolvedValue(document);
      mockDocumentRepository.update.mockResolvedValue(undefined);

      const result = await service.update(document.id, dto, adminUser);

      expect(result.title).toBe('Original');
    });
  });

  describe('remove', () => {
    it('should call softDelete by default', async () => {
      const document = makeDocument();
      mockDocumentRepository.findOne.mockResolvedValue(document);

      await service.remove(document.id, adminUser);

      expect(mockDocumentRepository.softDelete).toHaveBeenCalledWith(
        document.id,
      );
    });

    it('should call delete when useSoft is false', async () => {
      const document = makeDocument();
      mockDocumentRepository.findOne.mockResolvedValue(document);

      await service.remove(document.id, adminUser, false);

      expect(mockDocumentRepository.delete).toHaveBeenCalledWith(document.id);
    });

    it('should throw NotFoundException when document does not exist', async () => {
      mockDocumentRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('missing-id', adminUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteFile', () => {
    it('should delegate to storageService.deleteFile', async () => {
      mockStorageService.deleteFile.mockResolvedValue(undefined);

      await service.deleteFile('path/to/file.pdf');

      expect(mockStorageService.deleteFile).toHaveBeenCalledWith(
        'path/to/file.pdf',
      );
    });
  });
});
