import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { User } from 'src/app/user/common/entities/user.entity';
import { UserType } from 'src/app/user/common/enums/user-type.enum';
import { DocumentController } from './document.controller';
import { DocumentService } from './document.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { GetDocumentsDto } from './dto/get-documents.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { DocumentType } from './enums/document-type.enum';

const mockDocumentService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  downloadOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

const mockUser = {
  id: 'user-uuid',
  type: UserType.INVESTOR,
} as User;

const mockFile = { originalname: 'doc.pdf' } as Express.Multer.File;

const makeMockRes = () => ({
  setHeader: jest.fn(),
  send: jest.fn(),
});

describe('DocumentController', () => {
  let controller: DocumentController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentController],
      providers: [{ provide: DocumentService, useValue: mockDocumentService }],
    }).compile();

    controller = module.get<DocumentController>(DocumentController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    const dto: CreateDocumentDto = {
      title: 'My Document',
      value: 'doc-value',
      type: DocumentType.INVOICE,
    };
    const document = { id: 'doc-uuid', title: 'My Document' };

    it('should call documentService.create with dto, file and user', async () => {
      mockDocumentService.create.mockResolvedValue(document);

      await controller.create(dto, mockFile, mockUser);

      expect(mockDocumentService.create).toHaveBeenCalledWith(
        dto,
        mockFile,
        mockUser,
      );
    });

    it('should return status and created document data', async () => {
      mockDocumentService.create.mockResolvedValue(document);

      const result = await controller.create(dto, mockFile, mockUser);

      expect(result).toEqual({ status: 'success', data: document });
    });
  });

  describe('findAll', () => {
    const documents = [{ id: 'doc-1' }, { id: 'doc-2' }];

    beforeEach(() => {
      mockDocumentService.findAll.mockResolvedValue({
        data: documents,
        total: 2,
        page: 1,
        limit: 10,
      });
    });

    it('should call documentService.findAll with defaults when page/limit are absent', async () => {
      await controller.findAll({} as GetDocumentsDto, mockUser);

      expect(mockDocumentService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, limit: 10 }),
        mockUser,
      );
    });

    it('should call documentService.findAll with provided page and limit', async () => {
      mockDocumentService.findAll.mockResolvedValue({
        data: documents,
        total: 2,
        page: 3,
        limit: 5,
      });

      await controller.findAll(
        { page: 3, limit: 5 } as GetDocumentsDto,
        mockUser,
      );

      expect(mockDocumentService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ page: 3, limit: 5 }),
        mockUser,
      );
    });

    it('should return status, data and _metadata', async () => {
      const result = await controller.findAll({} as GetDocumentsDto, mockUser);

      expect(result).toEqual({
        status: 'success',
        data: documents,
        _metadata: { total: 2, length: documents.length, page: 1, limit: 10 },
      });
    });
  });

  describe('findOne', () => {
    it('should pass (id, user) to documentService.findOne and return its result directly', () => {
      const document = { id: 'doc-uuid', title: 'My Document' };
      mockDocumentService.findOne.mockReturnValue(document);

      const result = controller.findOne('doc-uuid', mockUser);

      expect(mockDocumentService.findOne).toHaveBeenCalledWith(
        'doc-uuid',
        mockUser,
      );
      expect(result).toBe(document);
    });
  });

  describe('downloadOne', () => {
    const buffer = Buffer.from('file-content');
    const makeDownloadResult = (filename: string, title = 'My Doc') => ({
      buffer,
      document: { id: 'doc-uuid', filename, title },
    });

    it('should set Content-Type application/pdf for .pdf files', async () => {
      const res = makeMockRes();
      mockDocumentService.downloadOne.mockResolvedValue(
        makeDownloadResult('invoice.pdf'),
      );

      await controller.downloadOne(
        'doc-uuid',
        mockUser,
        res as unknown as Response,
      );

      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/pdf',
      );
    });

    it('should set Content-Type image/jpeg for .jpg files', async () => {
      const res = makeMockRes();
      mockDocumentService.downloadOne.mockResolvedValue(
        makeDownloadResult('photo.jpg'),
      );

      await controller.downloadOne(
        'doc-uuid',
        mockUser,
        res as unknown as Response,
      );

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'image/jpeg');
    });

    it('should set Content-Type application/octet-stream for unknown extensions', async () => {
      const res = makeMockRes();
      mockDocumentService.downloadOne.mockResolvedValue(
        makeDownloadResult('archive.xyz'),
      );

      await controller.downloadOne(
        'doc-uuid',
        mockUser,
        res as unknown as Response,
      );

      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/octet-stream',
      );
    });

    it('should set Content-Disposition with title and extension and send the buffer', async () => {
      const res = makeMockRes();
      mockDocumentService.downloadOne.mockResolvedValue(
        makeDownloadResult('invoice.pdf', 'My Invoice'),
      );

      await controller.downloadOne(
        'doc-uuid',
        mockUser,
        res as unknown as Response,
      );

      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="My Invoice.pdf"',
      );
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Length',
        String(buffer.length),
      );
      expect(res.send).toHaveBeenCalledWith(buffer);
    });
  });

  describe('update', () => {
    it('should pass (id, dto, user) to documentService.update and return its result directly', () => {
      const dto: UpdateDocumentDto = { title: 'Updated Title' };
      const updated = { id: 'doc-uuid', title: 'Updated Title' };
      mockDocumentService.update.mockReturnValue(updated);

      const result = controller.update('doc-uuid', dto, mockUser);

      expect(mockDocumentService.update).toHaveBeenCalledWith(
        'doc-uuid',
        dto,
        mockUser,
      );
      expect(result).toBe(updated);
    });
  });

  describe('remove', () => {
    it('should pass (id, user) to documentService.remove and return its result directly', () => {
      const removeResult = { affected: 1 };
      mockDocumentService.remove.mockReturnValue(removeResult);

      const result = controller.remove('doc-uuid', mockUser);

      expect(mockDocumentService.remove).toHaveBeenCalledWith(
        'doc-uuid',
        mockUser,
      );
      expect(result).toBe(removeResult);
    });
  });
});
