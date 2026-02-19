import {
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DocumentService } from 'src/app/document/document.service';
import { DocumentType } from 'src/app/document/enums/document-type.enum';
import { User } from 'src/app/user/common/entities/user.entity';
import { UserType } from 'src/app/user/common/enums/user-type.enum';
import { Investor } from 'src/app/user/investor/entities/investor.entity';
import 'src/utils/object.extensions';
import { DebtorService } from './debtor.service';
import { CreateDebtorDto } from './dto/create-debtor.dto';
import { GetDebtorsDto } from './dto/get-debtors.dto';
import { UpdateDebtorDto } from './dto/update-debtor.dto';
import { Debtor } from './entities/debtor.entity';
import { DebtorStatus } from './enums/debtor-status.enum';

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

const mockDebtorRepository = {
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

const ownerInvestor = {
  id: 'owner-id',
  name: 'Owner',
  type: UserType.INVESTOR,
} as unknown as Investor;

const adminUser = { id: 'admin-id', type: UserType.ADMIN } as User;

const makeDebtor = (overrides: Partial<Debtor> = {}): Debtor =>
  ({
    id: 'debtor-id',
    status: DebtorStatus.PENDING,
    lastCommunication: 'original message',
    companyName: 'Debtor Co',
    taxId: 'B12345678',
    investor: { id: 'owner-id' } as Investor,
    documents: [],
    ...overrides,
  }) as unknown as Debtor;

const makeCreateDto = (): CreateDebtorDto => ({
  email: 'debtor@example.com',
  phoneNumber: '+34600000000',
  companyName: 'Debtor Co',
  taxId: 'B12345678',
  modelo111Csv: 'csv-111-data',
  modelo303Csv: 'csv-303-data',
});

const makeFile = (name: string) =>
  ({ originalname: name, filename: `${name}.pdf` }) as Express.Multer.File;
const file111 = makeFile('modelo111');
const file303 = makeFile('modelo303');
const makeFiles = (): { [key: string]: Express.Multer.File[] } => ({
  [DocumentType.MODELO_111]: [file111],
  [DocumentType.MODELO_303]: [file303],
});

describe('DebtorService', () => {
  let service: DebtorService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockQueryBuilder.getCount.mockResolvedValue(0);
    mockQueryBuilder.getMany.mockResolvedValue([]);
    mockQueryBuilder.getOne.mockResolvedValue(null);
    mockDebtorRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DebtorService,
        {
          provide: getRepositoryToken(Debtor),
          useValue: mockDebtorRepository,
        },
        { provide: DocumentService, useValue: mockDocumentService },
      ],
    }).compile();

    service = module.get<DebtorService>(DebtorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should throw BadRequestException when modelo111 file is missing', async () => {
      await expect(
        service.create(
          makeCreateDto(),
          { [DocumentType.MODELO_303]: [file303] },
          ownerInvestor,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when modelo303 file is missing', async () => {
      await expect(
        service.create(
          makeCreateDto(),
          { [DocumentType.MODELO_111]: [file111] },
          ownerInvestor,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should save debtor, create both documents and return debtor on happy path', async () => {
      const debtor = makeDebtor();
      const doc111 = { id: 'doc-111', filename: 'modelo111.pdf' };
      const doc303 = { id: 'doc-303', filename: 'modelo303.pdf' };

      mockDebtorRepository.save
        .mockResolvedValueOnce(debtor)
        .mockResolvedValueOnce({ ...debtor, documents: [doc111, doc303] });
      mockDocumentService.create
        .mockResolvedValueOnce(doc111)
        .mockResolvedValueOnce(doc303);

      const result = await service.create(
        makeCreateDto(),
        makeFiles(),
        ownerInvestor,
      );

      expect(mockDebtorRepository.save).toHaveBeenCalledTimes(2);
      expect(mockDocumentService.create).toHaveBeenCalledWith(
        expect.objectContaining({ type: DocumentType.MODELO_111 }),
        file111,
        ownerInvestor,
        debtor,
      );
      expect(mockDocumentService.create).toHaveBeenCalledWith(
        expect.objectContaining({ type: DocumentType.MODELO_303 }),
        file303,
        ownerInvestor,
        debtor,
      );
      expect(result).toBe(debtor);
    });

    it('should rollback debtor and modelo111 when modelo303 creation fails', async () => {
      const debtor = makeDebtor();
      const doc111 = { id: 'doc-111', filename: 'modelo111.pdf' };

      mockDebtorRepository.save.mockResolvedValueOnce(debtor);
      mockDocumentService.create
        .mockResolvedValueOnce(doc111)
        .mockRejectedValueOnce(new Error('upload failed'));

      await expect(
        service.create(makeCreateDto(), makeFiles(), ownerInvestor),
      ).rejects.toThrow();

      expect(mockDebtorRepository.delete).toHaveBeenCalledWith(debtor.id);
      expect(mockDocumentService.deleteFile).toHaveBeenCalledWith(
        doc111.filename,
      );
      expect(mockDocumentService.remove).toHaveBeenCalledWith(
        doc111.id,
        ownerInvestor,
        false,
      );
    });

    it('should throw BadRequestException on DB 23505 phoneNumber constraint', async () => {
      mockDebtorRepository.save.mockRejectedValue({
        code: '23505',
        detail: 'phoneNumber',
      });

      await expect(
        service.create(makeCreateDto(), makeFiles(), ownerInvestor),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException on DB 23505 companyName constraint', async () => {
      mockDebtorRepository.save.mockRejectedValue({
        code: '23505',
        detail: 'companyName',
      });

      await expect(
        service.create(makeCreateDto(), makeFiles(), ownerInvestor),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw InternalServerErrorException on unexpected error', async () => {
      mockDebtorRepository.save.mockRejectedValue(new Error('DB down'));

      await expect(
        service.create(makeCreateDto(), makeFiles(), ownerInvestor),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('findAll', () => {
    it('should join documents and investor for ADMIN without investor filter', async () => {
      await service.findAll({ page: 1, limit: 10 } as GetDebtorsDto, adminUser);

      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'debtor.documents',
        'documents',
      );
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'debtor.investor',
        'investor',
      );
      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalledWith(
        expect.stringContaining('investorId = :userId'),
        expect.anything(),
      );
    });

    it('should call withDeleted for ADMIN when includeDeleted > 0', async () => {
      await service.findAll(
        { page: 1, limit: 10, includeDeleted: 1 } as GetDebtorsDto,
        adminUser,
      );

      expect(mockQueryBuilder.withDeleted).toHaveBeenCalled();
    });

    it('should apply investorId/verifiedStatus filter for non-ADMIN', async () => {
      const investorUser = { id: 'inv-id', type: UserType.INVESTOR } as User;

      await service.findAll(
        { page: 1, limit: 10 } as GetDebtorsDto,
        investorUser,
      );

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('debtor.investorId = :userId'),
        expect.objectContaining({ userId: 'inv-id' }),
      );
    });

    it('should call withDeleted AND extra andWhere for non-ADMIN when includeDeleted > 0', async () => {
      const investorUser = { id: 'inv-id', type: UserType.INVESTOR } as User;

      await service.findAll(
        { page: 1, limit: 10, includeDeleted: 1 } as GetDebtorsDto,
        investorUser,
      );

      expect(mockQueryBuilder.withDeleted).toHaveBeenCalled();
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('debtor.deletedAt IS NULL'),
        expect.objectContaining({ userId: 'inv-id' }),
      );
    });

    it('should apply skip/take and return data/total/page/limit', async () => {
      const debtors = [makeDebtor()];
      mockQueryBuilder.getCount.mockResolvedValue(1);
      mockQueryBuilder.getMany.mockResolvedValue(debtors);

      const result = await service.findAll(
        { page: 2, limit: 5 } as GetDebtorsDto,
        adminUser,
      );

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(5);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(5);
      expect(result).toEqual({ data: debtors, total: 1, page: 2, limit: 5 });
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException when debtor is not found', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(service.findOne('missing-id', adminUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should join documents unconditionally for ADMIN', async () => {
      const debtor = makeDebtor();
      mockQueryBuilder.getOne.mockResolvedValue(debtor);

      await service.findOne(debtor.id, adminUser);

      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'debtor.documents',
        'documents',
      );
      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalledWith(
        expect.stringContaining('investorId'),
        expect.anything(),
      );
    });

    it('should apply investorId filter and conditional document join for non-ADMIN', async () => {
      const debtor = makeDebtor();
      const investorUser = { id: 'owner-id', type: UserType.INVESTOR } as User;
      mockQueryBuilder.getOne.mockResolvedValue(debtor);

      await service.findOne(debtor.id, investorUser);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('debtor.investorId = :userId'),
        expect.objectContaining({ userId: 'owner-id' }),
      );
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'debtor.documents',
        'documents',
        expect.stringContaining('investorId'),
        expect.objectContaining({ userId: 'owner-id' }),
      );
    });

    it('should return the found debtor', async () => {
      const debtor = makeDebtor();
      mockQueryBuilder.getOne.mockResolvedValue(debtor);

      const result = await service.findOne(debtor.id, adminUser);

      expect(result).toBe(debtor);
    });
  });

  describe('update', () => {
    it('should throw ForbiddenException when non-ADMIN user is not the owner', async () => {
      const debtor = makeDebtor({ investor: { id: 'owner-id' } as Investor });
      const otherUser = { id: 'other-id', type: UserType.INVESTOR } as User;
      mockQueryBuilder.getOne.mockResolvedValue(debtor);

      await expect(
        service.update(debtor.id, {} as UpdateDebtorDto, {}, otherUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should set PENDING and update lastCommunication when CORRECTION debtor is submitted', async () => {
      const debtor = makeDebtor({
        status: DebtorStatus.CORRECTION,
        investor: { id: 'owner-id' } as Investor,
      });
      const sellerUser = { id: 'owner-id', type: UserType.INVESTOR } as User;
      const dto: UpdateDebtorDto = { status: DebtorStatus.PENDING };
      mockQueryBuilder.getOne.mockResolvedValue(debtor);
      mockDebtorRepository.save.mockResolvedValue(debtor);

      await service.update(debtor.id, dto, {}, sellerUser);

      expect(dto.status).toBe(DebtorStatus.PENDING);
      expect(dto.lastCommunication).toBe(
        'Pendiente de revisión por usuario administrador',
      );
    });

    it('should reset dto.status and lastCommunication when CORRECTION debtor is saved without submitting', async () => {
      const debtor = makeDebtor({
        status: DebtorStatus.CORRECTION,
        lastCommunication: 'original message',
        investor: { id: 'owner-id' } as Investor,
      });
      const sellerUser = { id: 'owner-id', type: UserType.INVESTOR } as User;
      const dto: UpdateDebtorDto = { companyName: 'New Name' };
      mockQueryBuilder.getOne.mockResolvedValue(debtor);
      mockDebtorRepository.save.mockResolvedValue(debtor);

      await service.update(debtor.id, dto, {}, sellerUser);

      expect(dto.status).toBe(DebtorStatus.CORRECTION);
      expect(dto.lastCommunication).toBe('original message');
    });

    it('should throw UnauthorizedException when non-ADMIN tries to set an unauthorized status', async () => {
      const debtor = makeDebtor({
        status: DebtorStatus.PENDING,
        investor: { id: 'owner-id' } as Investor,
      });
      const sellerUser = { id: 'owner-id', type: UserType.INVESTOR } as User;
      const dto: UpdateDebtorDto = { status: DebtorStatus.VERIFIED };
      mockQueryBuilder.getOne.mockResolvedValue(debtor);

      await expect(
        service.update(debtor.id, dto, {}, sellerUser),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reset protected fields and discard files for VERIFIED debtor (non-ADMIN)', async () => {
      const debtor = makeDebtor({
        status: DebtorStatus.VERIFIED,
        companyName: 'Original Co',
        taxId: 'B12345678',
        lastCommunication: 'approved',
        investor: { id: 'owner-id' } as Investor,
      });
      const sellerUser = { id: 'owner-id', type: UserType.INVESTOR } as User;
      const dto: UpdateDebtorDto = {
        companyName: 'Changed Co',
        taxId: 'A99999999',
        status: DebtorStatus.VERIFIED,
      };
      mockQueryBuilder.getOne.mockResolvedValue(debtor);
      mockDebtorRepository.save.mockResolvedValue(debtor);

      await service.update(debtor.id, dto, makeFiles(), sellerUser);

      expect(dto.companyName).toBe('Original Co');
      expect(dto.taxId).toBe('B12345678');
      expect(dto.status).toBe(DebtorStatus.VERIFIED);
      expect(dto.lastCommunication).toBe('approved');
      expect(mockDocumentService.create).not.toHaveBeenCalled();
    });

    it('should discard files for ADMIN update and save the debtor', async () => {
      const debtor = makeDebtor();
      mockQueryBuilder.getOne.mockResolvedValue(debtor);
      mockDebtorRepository.save.mockResolvedValue(debtor);

      await service.update(
        debtor.id,
        { companyName: 'Updated' } as UpdateDebtorDto,
        makeFiles(),
        adminUser,
      );

      expect(mockDocumentService.create).not.toHaveBeenCalled();
      expect(mockDebtorRepository.save).toHaveBeenCalled();
    });

    it('should create modelo111 document and push to debtor.documents when file and CSV are provided', async () => {
      const debtor = makeDebtor({
        status: DebtorStatus.PENDING,
        investor: { id: 'owner-id' } as Investor,
        documents: [],
      });
      const sellerUser = { id: 'owner-id', type: UserType.INVESTOR } as User;
      const dto: UpdateDebtorDto = {
        modelo111Csv: 'new-csv-111',
        status: DebtorStatus.PENDING,
      };
      const doc111 = { id: 'doc-111', filename: 'modelo111.pdf' };

      mockQueryBuilder.getOne.mockResolvedValue(debtor);
      mockDocumentService.create.mockResolvedValue(doc111);
      mockDebtorRepository.save.mockResolvedValue(debtor);

      await service.update(
        debtor.id,
        dto,
        { [DocumentType.MODELO_111]: [file111] },
        sellerUser,
      );

      expect(mockDocumentService.create).toHaveBeenCalledWith(
        expect.objectContaining({ type: DocumentType.MODELO_111 }),
        file111,
        sellerUser,
        debtor,
      );
      expect(debtor.documents).toContain(doc111);
    });

    it('should throw BadRequestException when modelo111 file is uploaded without modelo111Csv', async () => {
      const debtor = makeDebtor({
        status: DebtorStatus.PENDING,
        investor: { id: 'owner-id' } as Investor,
      });
      const sellerUser = { id: 'owner-id', type: UserType.INVESTOR } as User;
      const dto: UpdateDebtorDto = { status: DebtorStatus.PENDING };

      mockQueryBuilder.getOne.mockResolvedValue(debtor);

      await expect(
        service.update(
          debtor.id,
          dto,
          { [DocumentType.MODELO_111]: [file111] },
          sellerUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when modelo303 file is uploaded without modelo303Csv', async () => {
      const debtor = makeDebtor({
        status: DebtorStatus.PENDING,
        investor: { id: 'owner-id' } as Investor,
      });
      const sellerUser = { id: 'owner-id', type: UserType.INVESTOR } as User;
      const dto: UpdateDebtorDto = { status: DebtorStatus.PENDING };

      mockQueryBuilder.getOne.mockResolvedValue(debtor);

      await expect(
        service.update(
          debtor.id,
          dto,
          { [DocumentType.MODELO_303]: [file303] },
          sellerUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should rollback document and throw InternalServerErrorException on unexpected error', async () => {
      const debtor = makeDebtor({
        status: DebtorStatus.PENDING,
        investor: { id: 'owner-id' } as Investor,
        documents: [],
      });
      const sellerUser = { id: 'owner-id', type: UserType.INVESTOR } as User;
      const dto: UpdateDebtorDto = {
        modelo111Csv: 'new-csv-111',
        status: DebtorStatus.PENDING,
      };
      const doc111 = { id: 'doc-111', filename: 'modelo111.pdf' };

      mockQueryBuilder.getOne.mockResolvedValue(debtor);
      mockDocumentService.create.mockResolvedValue(doc111);
      mockDebtorRepository.save.mockRejectedValue(new Error('DB error'));

      await expect(
        service.update(
          debtor.id,
          dto,
          { [DocumentType.MODELO_111]: [file111] },
          sellerUser,
        ),
      ).rejects.toThrow(InternalServerErrorException);

      expect(mockDocumentService.deleteFile).toHaveBeenCalledWith(
        doc111.filename,
      );
      expect(mockDocumentService.remove).toHaveBeenCalledWith(
        doc111.id,
        sellerUser,
        false,
      );
    });
  });

  describe('remove', () => {
    it('should throw ForbiddenException when user is not the owner', async () => {
      const debtor = makeDebtor({ investor: { id: 'owner-id' } as Investor });
      const otherUser = { id: 'other-id', type: UserType.INVESTOR } as User;
      mockQueryBuilder.getOne.mockResolvedValue(debtor);

      await expect(service.remove(debtor.id, otherUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should call softDelete by default', async () => {
      const debtor = makeDebtor({ investor: { id: 'owner-id' } as Investor });
      const ownerUser = { id: 'owner-id', type: UserType.INVESTOR } as User;
      mockQueryBuilder.getOne.mockResolvedValue(debtor);
      mockDebtorRepository.softDelete.mockResolvedValue(undefined);

      await service.remove(debtor.id, ownerUser);

      expect(mockDebtorRepository.softDelete).toHaveBeenCalledWith(debtor.id);
    });

    it('should call delete when useSoft is false', async () => {
      const debtor = makeDebtor({ investor: { id: 'owner-id' } as Investor });
      const ownerUser = { id: 'owner-id', type: UserType.INVESTOR } as User;
      mockQueryBuilder.getOne.mockResolvedValue(debtor);
      mockDebtorRepository.delete.mockResolvedValue(undefined);

      await service.remove(debtor.id, ownerUser, false);

      expect(mockDebtorRepository.delete).toHaveBeenCalledWith(debtor.id);
    });
  });
});
