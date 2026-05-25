import {
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DebtorService } from 'src/app/debtor/debtor.service';
import { DebtorStatus } from 'src/app/debtor/enums/debtor-status.enum';
import { DocumentService } from 'src/app/document/document.service';
import { DocumentType } from 'src/app/document/enums/document-type.enum';
import 'src/utils/object.extensions';
import { User } from '../user/common/entities/user.entity';
import { UserType } from '../user/common/enums/user-type.enum';
import { Investor } from '../user/investor/entities/investor.entity';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { GetInvoicesDto } from './dto/get-invoices.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { Invoice } from './entities/invoice.entity';
import { InvoiceStatus } from './enums/invoice-status.enum';
import { InvoiceService } from './invoice.service';

const mockQueryBuilder = {
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  withDeleted: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  getCount: jest.fn().mockResolvedValue(0),
  getMany: jest.fn().mockResolvedValue([]),
  getOne: jest.fn().mockResolvedValue(null),
};

const mockInvoiceRepository = {
  save: jest.fn(),
  delete: jest.fn(),
  softDelete: jest.fn(),
  createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
};

const mockDocumentService = {
  create: jest.fn(),
  deleteFile: jest.fn(),
  remove: jest.fn(),
};

const mockDebtorService = {
  findOne: jest.fn(),
};

const adminUser = { id: 'admin-id', type: UserType.ADMIN } as User;

const makeInvoice = (overrides: Partial<Invoice> = {}): Invoice =>
  ({
    id: 'invoice-id',
    status: InvoiceStatus.PENDING,
    lastCommunication: 'original message',
    rating: 4.5,
    extRating: 4.4,
    amount: 5000,
    documents: [],
    sellerInvestor: { id: 'seller-id' } as Investor,
    debtor: { id: 'debtor-id', taxId: '12345678A' },
    ...overrides,
  }) as unknown as Invoice;

const makeDebtor = (
  overrides: Partial<{
    id: string;
    status: DebtorStatus;
    investorId: string;
    companyName: string;
  }> = {},
) => ({
  id: overrides.id ?? 'debtor-id',
  status: overrides.status ?? DebtorStatus.VERIFIED,
  investor: { id: overrides.investorId ?? 'seller-id' },
  companyName: overrides.companyName ?? 'Debtor Co',
  taxId: '12345678A',
});

const makeCreateDto = (): CreateInvoiceDto => {
  const futureDate = new Date();
  futureDate.setMonth(futureDate.getMonth() + 6);
  const dueDateString = futureDate.toISOString().split('T')[0];
  return {
    debtorId: 'debtor-id',
    amount: 5000,
    dueDate: dueDateString,
    svc: 'B12345678-F001-00001234-20260216-A9K3',
  };
};

const mockFile = { originalname: 'invoice.pdf' } as Express.Multer.File;

describe('InvoiceService', () => {
  let service: InvoiceService;

  beforeAll(() => {
    process.env.BUYER_TRANSFER_FEE_PERCENTAGE = '2.5';
    process.env.SELLER_TRANSFER_FEE_PERCENTAGE = '1.5';
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    mockQueryBuilder.getCount.mockResolvedValue(0);
    mockQueryBuilder.getMany.mockResolvedValue([]);
    mockQueryBuilder.getOne.mockResolvedValue(null);
    mockInvoiceRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoiceService,
        {
          provide: getRepositoryToken(Invoice),
          useValue: mockInvoiceRepository,
        },
        { provide: DocumentService, useValue: mockDocumentService },
        { provide: DebtorService, useValue: mockDebtorService },
      ],
    }).compile();

    service = module.get<InvoiceService>(InvoiceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const sellerUser = {
      id: 'seller-id',
      name: 'Seller',
      type: UserType.INVESTOR,
    } as unknown as Investor;

    it('should throw BadRequestException when file is not provided', async () => {
      await expect(
        service.create(
          makeCreateDto(),
          undefined as unknown as Express.Multer.File,
          sellerUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when debtor status is not VERIFIED', async () => {
      mockDebtorService.findOne.mockResolvedValue(
        makeDebtor({ status: DebtorStatus.PENDING }),
      );

      await expect(
        service.create(makeCreateDto(), mockFile, sellerUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when debtor does not belong to the user', async () => {
      mockDebtorService.findOne.mockResolvedValue(
        makeDebtor({ investorId: 'different-investor-id' }),
      );

      await expect(
        service.create(makeCreateDto(), mockFile, sellerUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('should save invoice, create document and return invoice on happy path', async () => {
      const debtor = makeDebtor();
      const invoice = makeInvoice({ id: 'new-invoice-id' });
      const document = { id: 'doc-id', filename: 'file.pdf' };

      mockDebtorService.findOne.mockResolvedValue(debtor);
      mockInvoiceRepository.save
        .mockResolvedValueOnce(invoice)
        .mockResolvedValueOnce({ ...invoice, documents: [document] });
      mockDocumentService.create.mockResolvedValue(document);

      const result = await service.create(
        makeCreateDto(),
        mockFile,
        sellerUser,
      );

      expect(mockDebtorService.findOne).toHaveBeenCalledWith(
        'debtor-id',
        sellerUser,
      );
      expect(mockInvoiceRepository.save).toHaveBeenCalledTimes(2);
      expect(mockDocumentService.create).toHaveBeenCalledWith(
        expect.objectContaining({ type: DocumentType.INVOICE }),
        mockFile,
        sellerUser,
      );
      expect(result).toBe(invoice);
    });

    it('should rollback document and invoice on error during save', async () => {
      const debtor = makeDebtor();
      const invoice = makeInvoice({ id: 'new-invoice-id' });
      const document = { id: 'doc-id', filename: 'file.pdf' };

      mockDebtorService.findOne.mockResolvedValue(debtor);
      mockInvoiceRepository.save
        .mockResolvedValueOnce(invoice)
        .mockRejectedValueOnce(new Error('DB error'));
      mockDocumentService.create.mockResolvedValue(document);

      await expect(
        service.create(makeCreateDto(), mockFile, sellerUser),
      ).rejects.toThrow();

      expect(mockDocumentService.remove).toHaveBeenCalledWith(
        document.id,
        sellerUser,
        false,
      );
      expect(mockInvoiceRepository.delete).toHaveBeenCalledWith(invoice.id);
    });
  });

  describe('findAll', () => {
    it('should NOT apply investor filter for ADMIN user', async () => {
      await service.findAll(
        { page: 1, limit: 10 } as GetInvoicesDto,
        adminUser,
      );

      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalledWith(
        expect.stringContaining('sellerInvestorId = :investorId'),
        expect.anything(),
      );
      expect(mockQueryBuilder.getCount).toHaveBeenCalled();
      expect(mockQueryBuilder.getMany).toHaveBeenCalled();
    });

    it('should apply investor/verified filter for non-ADMIN user', async () => {
      const investorUser = { id: 'inv-id', type: UserType.INVESTOR } as User;

      await service.findAll(
        { page: 1, limit: 10 } as GetInvoicesDto,
        investorUser,
      );

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(sellerInvestor.id = :investorId OR (invoice.status = :status AND buyerInvestor.id = :investorId))',
        expect.objectContaining({ investorId: 'inv-id', status: 'verified' }),
      );
    });

    it('should call withDeleted for ADMIN when includeDeleted > 0', async () => {
      await service.findAll(
        { page: 1, limit: 10, includeDeleted: 1 } as GetInvoicesDto,
        adminUser,
      );

      expect(mockQueryBuilder.withDeleted).toHaveBeenCalled();
      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalledWith(
        expect.stringContaining('debtor.deletedAt'),
        expect.anything(),
      );
    });

    it('should call withDeleted for non-ADMIN when includeDeleted > 0', async () => {
      const investorUser = { id: 'inv-id', type: UserType.INVESTOR } as User;

      await service.findAll(
        { page: 1, limit: 10, includeDeleted: 1 } as GetInvoicesDto,
        investorUser,
      );

      expect(mockQueryBuilder.withDeleted).toHaveBeenCalled();
    });

    it('should apply skip/take from page and limit and return data/total', async () => {
      const invoices = [makeInvoice()];
      mockQueryBuilder.getCount.mockResolvedValue(1);
      mockQueryBuilder.getMany.mockResolvedValue(invoices);

      const result = await service.findAll(
        { page: 2, limit: 5 } as GetInvoicesDto,
        adminUser,
      );

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(5);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(5);
      expect(result).toEqual({ data: invoices, total: 1, page: 2, limit: 5 });
    });
  });

  describe('findOne', () => {
    it('should throw BadRequestException when invoice is not found', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(service.findOne('missing-id', adminUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should join documents without condition for ADMIN', async () => {
      const invoice = makeInvoice();
      mockQueryBuilder.getOne.mockResolvedValue(invoice);

      await service.findOne(invoice.id, adminUser);

      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'invoice.documents',
        'documents',
      );
    });

    it('should apply seller/verified filter and conditional document join for non-ADMIN', async () => {
      const investorUser = { id: 'seller-id', type: UserType.INVESTOR } as User;
      const invoice = makeInvoice();
      mockQueryBuilder.getOne.mockResolvedValue(invoice);

      await service.findOne(invoice.id, investorUser);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('sellerInvestorId = :investorId'),
        expect.objectContaining({ investorId: 'seller-id' }),
      );
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'invoice.documents',
        'documents',
        expect.stringContaining('sellerInvestorId'),
        expect.objectContaining({ investorId: 'seller-id' }),
      );
    });

    it('should return the found invoice', async () => {
      const invoice = makeInvoice();
      mockQueryBuilder.getOne.mockResolvedValue(invoice);

      const result = await service.findOne(invoice.id, adminUser);

      expect(result).toBe(invoice);
    });
  });

  describe('update', () => {
    it('should throw ForbiddenException when non-ADMIN user is not the seller', async () => {
      const invoice = makeInvoice({
        sellerInvestor: { id: 'seller-id' } as Investor,
      });
      const otherUser = { id: 'other-id', type: UserType.INVESTOR } as User;
      mockQueryBuilder.getOne.mockResolvedValue(invoice);

      await expect(
        service.update(
          invoice.id,
          {} as UpdateInvoiceDto,
          undefined,
          otherUser,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should set dto.status to PENDING and update lastCommunication when CORRECTION invoice is submitted', async () => {
      const invoice = makeInvoice({
        status: InvoiceStatus.CORRECTION,
        sellerInvestor: { id: 'seller-id' } as Investor,
      });
      const sellerUser = { id: 'seller-id', type: UserType.INVESTOR } as User;
      const dto: UpdateInvoiceDto = { status: InvoiceStatus.PENDING };
      mockQueryBuilder.getOne.mockResolvedValue(invoice);
      mockInvoiceRepository.save.mockResolvedValue(invoice);

      await service.update(invoice.id, dto, undefined, sellerUser);

      expect(dto.status).toBe(InvoiceStatus.PENDING);
      expect(dto.lastCommunication).toBe(
        'Pendiente de revisión por usuario administrador',
      );
    });

    it('should reset dto.status and lastCommunication when CORRECTION invoice is saved without submitting', async () => {
      const invoice = makeInvoice({
        status: InvoiceStatus.CORRECTION,
        lastCommunication: 'original message',
        sellerInvestor: { id: 'seller-id' } as Investor,
      });
      const sellerUser = { id: 'seller-id', type: UserType.INVESTOR } as User;
      const dto: UpdateInvoiceDto = { amount: 9000 };
      mockQueryBuilder.getOne.mockResolvedValue(invoice);
      mockInvoiceRepository.save.mockResolvedValue(invoice);

      await service.update(invoice.id, dto, undefined, sellerUser);

      expect(dto.status).toBe(InvoiceStatus.CORRECTION);
      expect(dto.lastCommunication).toBe('original message');
    });

    it('should throw UnauthorizedException when non-ADMIN tries to set an unauthorized status', async () => {
      const invoice = makeInvoice({
        status: InvoiceStatus.PENDING,
        sellerInvestor: { id: 'seller-id' } as Investor,
      });
      const sellerUser = { id: 'seller-id', type: UserType.INVESTOR } as User;
      const dto: UpdateInvoiceDto = { status: InvoiceStatus.VERIFIED };
      mockQueryBuilder.getOne.mockResolvedValue(invoice);

      await expect(
        service.update(invoice.id, dto, undefined, sellerUser),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reset protected fields and discard file for VERIFIED invoice (non-ADMIN)', async () => {
      const invoice = makeInvoice({
        status: InvoiceStatus.VERIFIED,
        rating: 4.5,
        extRating: 4.4,
        lastCommunication: 'approved',
        sellerInvestor: { id: 'seller-id' } as Investor,
      });
      const sellerUser = { id: 'seller-id', type: UserType.INVESTOR } as User;
      const dto: UpdateInvoiceDto = {
        rating: 1,
        extRating: 1,
        status: InvoiceStatus.VERIFIED,
      };
      mockQueryBuilder.getOne.mockResolvedValue(invoice);
      mockInvoiceRepository.save.mockResolvedValue(invoice);

      await service.update(invoice.id, dto, mockFile, sellerUser);

      expect(dto.rating).toBe(4.5);
      expect(dto.extRating).toBe(4.4);
      expect(dto.status).toBe(InvoiceStatus.VERIFIED);
      expect(dto.lastCommunication).toBe('approved');
      expect(mockDocumentService.create).not.toHaveBeenCalled();
    });

    it('should discard file for ADMIN update and save the invoice', async () => {
      const invoice = makeInvoice();
      mockQueryBuilder.getOne.mockResolvedValue(invoice);
      mockInvoiceRepository.save.mockResolvedValue(invoice);

      await service.update(
        invoice.id,
        { amount: 9000 } as UpdateInvoiceDto,
        mockFile,
        adminUser,
      );

      expect(mockDocumentService.create).not.toHaveBeenCalled();
      expect(mockInvoiceRepository.save).toHaveBeenCalled();
    });

    it('should create document and push to invoice.documents when file is provided (non-ADMIN)', async () => {
      const invoice = makeInvoice({
        status: InvoiceStatus.PENDING,
        sellerInvestor: { id: 'seller-id' } as Investor,
        debtor: {
          id: 'debtor-id',
          taxId: '12345678A',
        } as unknown as Invoice['debtor'],
        documents: [],
      });
      const sellerUser = {
        id: 'seller-id',
        name: 'Seller',
        type: UserType.INVESTOR,
      } as unknown as User;
      const dto: UpdateInvoiceDto = { status: InvoiceStatus.PENDING };
      const document = { id: 'doc-id', filename: 'file.pdf' };

      mockQueryBuilder.getOne.mockResolvedValue(invoice);
      mockDocumentService.create.mockResolvedValue(document);
      mockInvoiceRepository.save.mockResolvedValue(invoice);

      await service.update(invoice.id, dto, mockFile, sellerUser);

      expect(mockDocumentService.create).toHaveBeenCalledWith(
        expect.objectContaining({ type: DocumentType.INVOICE }),
        mockFile,
        sellerUser,
      );
      expect(invoice.documents).toContain(document);
      expect(mockInvoiceRepository.save).toHaveBeenCalled();
    });

    it('should rollback document on error and throw InternalServerErrorException', async () => {
      const invoice = makeInvoice({
        status: InvoiceStatus.PENDING,
        sellerInvestor: { id: 'seller-id' } as Investor,
        debtor: {
          id: 'debtor-id',
          taxId: '12345678A',
        } as unknown as Invoice['debtor'],
        documents: [],
      });
      const sellerUser = {
        id: 'seller-id',
        name: 'Seller',
        type: UserType.INVESTOR,
      } as unknown as User;
      const dto: UpdateInvoiceDto = { status: InvoiceStatus.PENDING };
      const document = { id: 'doc-id', filename: 'file.pdf' };

      mockQueryBuilder.getOne.mockResolvedValue(invoice);
      mockDocumentService.create.mockResolvedValue(document);
      mockInvoiceRepository.save.mockRejectedValue(new Error('DB error'));

      await expect(
        service.update(invoice.id, dto, mockFile, sellerUser),
      ).rejects.toThrow(InternalServerErrorException);

      expect(mockDocumentService.deleteFile).toHaveBeenCalledWith(
        document.filename,
      );
      expect(mockDocumentService.remove).toHaveBeenCalledWith(
        document.id,
        sellerUser,
        false,
      );
    });
  });

  describe('remove', () => {
    it('should throw ForbiddenException when user is not the seller', async () => {
      const invoice = makeInvoice({
        sellerInvestor: { id: 'seller-id' } as Investor,
      });
      const otherUser = { id: 'other-id', type: UserType.INVESTOR } as User;
      mockQueryBuilder.getOne.mockResolvedValue(invoice);

      await expect(service.remove(invoice.id, otherUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should call softDelete by default', async () => {
      const invoice = makeInvoice({
        sellerInvestor: { id: 'seller-id' } as Investor,
      });
      const sellerUser = { id: 'seller-id', type: UserType.INVESTOR } as User;
      mockQueryBuilder.getOne.mockResolvedValue(invoice);
      mockInvoiceRepository.softDelete.mockResolvedValue(undefined);

      await service.remove(invoice.id, sellerUser);

      expect(mockInvoiceRepository.softDelete).toHaveBeenCalledWith(invoice.id);
    });

    it('should call delete when useSoft is false', async () => {
      const invoice = makeInvoice({
        sellerInvestor: { id: 'seller-id' } as Investor,
      });
      const sellerUser = { id: 'seller-id', type: UserType.INVESTOR } as User;
      mockQueryBuilder.getOne.mockResolvedValue(invoice);
      mockInvoiceRepository.delete.mockResolvedValue(undefined);

      await service.remove(invoice.id, sellerUser, false);

      expect(mockInvoiceRepository.delete).toHaveBeenCalledWith(invoice.id);
    });
  });

  describe('dueDate — date pipeline', () => {
    const sellerUser = {
      id: 'seller-id',
      name: 'Seller',
      type: UserType.INVESTOR,
    } as unknown as Investor;

    it('persists dueDate as a "yyyy-MM-dd" string (no time/timezone component)', async () => {
      const debtor = makeDebtor();
      const invoice = makeInvoice({ id: 'new-invoice-id' });
      const document = { id: 'doc-id', filename: 'file.pdf' };

      mockDebtorService.findOne.mockResolvedValue(debtor);
      mockDocumentService.create.mockResolvedValue(document);
      mockInvoiceRepository.save
        .mockResolvedValueOnce(invoice)
        .mockResolvedValueOnce({ ...invoice, documents: [document] });

      const dto = makeCreateDto(); // dueDate: "2026-11-01"
      await service.create(dto, mockFile, sellerUser);

      // The first save call receives the raw DTO values — dueDate must be
      // passed through as-is (a plain "yyyy-MM-dd" string, no conversion)
      const savedPayload = (
        mockInvoiceRepository.save.mock.calls[0] as unknown[]
      )[0] as Record<string, unknown>;
      expect(savedPayload.dueDate).toBe(dto.dueDate);
    });

    it('dueDate value from DTO is not converted to a Date object before saving', async () => {
      const debtor = makeDebtor();
      const invoice = makeInvoice({ id: 'new-invoice-id' });
      const document = { id: 'doc-id', filename: 'file.pdf' };

      mockDebtorService.findOne.mockResolvedValue(debtor);
      mockDocumentService.create.mockResolvedValue(document);
      mockInvoiceRepository.save
        .mockResolvedValueOnce(invoice)
        .mockResolvedValueOnce({ ...invoice, documents: [document] });

      await service.create(makeCreateDto(), mockFile, sellerUser);

      const savedPayload = (
        mockInvoiceRepository.save.mock.calls[0] as unknown[]
      )[0] as Record<string, unknown>;
      // Must be a string, not a Date object — TypeORM handles DATE columns
      // by accepting plain date strings and storing them without timezone conversion
      expect(typeof savedPayload.dueDate).toBe('string');
    });

    it('passes dueDateFrom filter string directly to query builder without conversion', async () => {
      const adminUser_ = { id: 'admin-id', type: UserType.ADMIN } as User;

      await service.findAll(
        { page: 1, limit: 10, dueDateFrom: '2026-04-01' } as GetInvoicesDto,
        adminUser_,
      );

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('dueDate >= :dueDateFrom'),
        expect.objectContaining({ dueDateFrom: '2026-04-01' }),
      );
    });

    it('passes dueDateTo filter string directly to query builder without conversion', async () => {
      const adminUser_ = { id: 'admin-id', type: UserType.ADMIN } as User;

      await service.findAll(
        { page: 1, limit: 10, dueDateTo: '2026-06-30' } as GetInvoicesDto,
        adminUser_,
      );

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('dueDate <= :dueDateTo'),
        expect.objectContaining({ dueDateTo: '2026-06-30' }),
      );
    });
  });
});
