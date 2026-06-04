import {
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { BankAccountService } from 'src/app/bank-account/bank-account.service';
import { DocumentService } from 'src/app/document/document.service';
import { DocumentType } from 'src/app/document/enums/document-type.enum';
import 'src/utils/object.extensions';
import { User } from '../common/entities/user.entity';
import { UserType } from '../common/enums/user-type.enum';
import { GetInvestorsDto } from './dto/get-investors.dto';
import { UpdateInvestorDto } from './dto/update-investor.dto';
import { Investor } from './entities/investor.entity';
import { InvestorStatus } from './enums/investor-status.enum';
import { InvestorService } from './investor.service';

jest.mock('bcrypt');
const bcryptHash = bcrypt.hash as jest.MockedFunction<typeof bcrypt.hash>;

const mockQueryBuilder = {
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  leftJoin: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  withDeleted: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  getCount: jest.fn().mockResolvedValue(0),
  getMany: jest.fn().mockResolvedValue([]),
  getOne: jest.fn().mockResolvedValue(null),
};

const mockInvestorRepository = {
  findOne: jest.fn(),
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

const mockBankAccountService = {
  create: jest.fn(),
  remove: jest.fn(),
};

const adminUser = { id: 'admin-id', type: UserType.ADMIN } as User;
const makeInvestor = (overrides: Partial<Investor> = {}): Investor =>
  ({
    id: 'investor-id',
    email: 'investor@example.com',
    name: 'Investor',
    companyName: 'Acme',
    taxId: '12345678A',
    investorType: 'individual',
    status: InvestorStatus.VERIFIED,
    lastCommunication: 'some message',
    password: 'hashed',
    documents: [],
    ...overrides,
  }) as unknown as Investor;

const mockFile = { originalname: 'doc.pdf' } as Express.Multer.File;

describe('InvestorService', () => {
  let service: InvestorService;

  beforeEach(async () => {
    jest.clearAllMocks();
    bcryptHash.mockResolvedValue('hashed-password' as never);
    mockQueryBuilder.getCount.mockResolvedValue(0);
    mockQueryBuilder.getMany.mockResolvedValue([]);
    mockQueryBuilder.getOne.mockResolvedValue(null);
    mockInvestorRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvestorService,
        {
          provide: getRepositoryToken(Investor),
          useValue: mockInvestorRepository,
        },
        { provide: DocumentService, useValue: mockDocumentService },
        { provide: BankAccountService, useValue: mockBankAccountService },
      ],
    }).compile();

    service = module.get<InvestorService>(InvestorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const makeCreateDto = () => ({
      email: 'investor@example.com',
      password: 'password123',
      passwordRepeat: 'password123',
      name: 'Investor',
      companyName: 'Acme',
      phoneNumber: '+34600000000',
      taxId: '12345678A',
      investorType: 'individual',
    });

    it('should throw BadRequestException when passwords do not match', async () => {
      await expect(
        service.create(
          { ...makeCreateDto(), passwordRepeat: 'different' },
          mockFile,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when no document file is provided', async () => {
      await expect(service.create(makeCreateDto(), undefined)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should hash password, create bankAccount, save investor, create document and return investor', async () => {
      const bankAccount = { id: 'ba-id' };
      const investor = makeInvestor();
      const document = { id: 'doc-id', filename: 'file.pdf' };

      mockBankAccountService.create.mockResolvedValue(bankAccount);
      mockInvestorRepository.save.mockResolvedValue(investor);
      mockDocumentService.create.mockResolvedValue(document);

      const result = await service.create(makeCreateDto(), mockFile);

      expect(bcryptHash).toHaveBeenCalledWith('password123', 10);
      expect(mockBankAccountService.create).toHaveBeenCalled();
      expect(mockInvestorRepository.save).toHaveBeenCalled();
      expect(mockDocumentService.create).toHaveBeenCalledWith(
        expect.objectContaining({ type: DocumentType.ID }),
        mockFile,
        investor,
      );
      expect(result).toBe(investor);
    });

    it('should rollback on DB error 23505 for phoneNumber and throw BadRequestException', async () => {
      const investor = makeInvestor();
      const bankAccount = { id: 'ba-id' };
      mockBankAccountService.create.mockResolvedValue(bankAccount);
      mockInvestorRepository.save.mockResolvedValue(investor);
      mockDocumentService.create.mockRejectedValue({
        code: '23505',
        detail: 'phoneNumber',
      });

      await expect(service.create(makeCreateDto(), mockFile)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockInvestorRepository.delete).toHaveBeenCalledWith(investor.id);
      expect(mockBankAccountService.remove).toHaveBeenCalledWith(
        bankAccount.id,
      );
    });

    it('should rollback on DB error 23505 for email and throw BadRequestException', async () => {
      const investor = makeInvestor();
      const bankAccount = { id: 'ba-id' };
      mockBankAccountService.create.mockResolvedValue(bankAccount);
      mockInvestorRepository.save.mockResolvedValue(investor);
      mockDocumentService.create.mockRejectedValue({
        code: '23505',
        detail: 'email',
      });

      await expect(service.create(makeCreateDto(), mockFile)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should rollback and throw InternalServerErrorException on unexpected error', async () => {
      const bankAccount = { id: 'ba-id' };
      mockBankAccountService.create.mockResolvedValue(bankAccount);
      mockInvestorRepository.save.mockRejectedValue(new Error('DB down'));

      await expect(service.create(makeCreateDto(), mockFile)).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(mockBankAccountService.remove).toHaveBeenCalledWith(
        bankAccount.id,
      );
    });
  });

  describe('findAll', () => {
    const query: GetInvestorsDto = { page: 1, limit: 10 } as GetInvestorsDto;

    it('should restrict fields and filter VERIFIED status for non-admin user', async () => {
      const investorUser = { id: 'inv-id', type: UserType.INVESTOR } as User;

      await service.findAll(query, investorUser);

      expect(mockQueryBuilder.select).toHaveBeenCalled();
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(investor.status = :status)',
        { status: InvestorStatus.VERIFIED },
      );
    });

    it('should return data, total, page and limit', async () => {
      const investors = [makeInvestor()];
      mockQueryBuilder.getCount.mockResolvedValue(1);
      mockQueryBuilder.getMany.mockResolvedValue(investors);

      const result = await service.findAll(query, adminUser);

      expect(result).toEqual({
        data: investors,
        total: 1,
        page: 1,
        limit: 10,
      });
    });
  });

  describe('findOne', () => {
    it('should use leftJoinAndSelect for admin user', async () => {
      const investor = makeInvestor();
      mockQueryBuilder.getOne.mockResolvedValue(investor);

      await service.findOne(investor.id, adminUser);

      expect(mockQueryBuilder.leftJoinAndSelect).not.toHaveBeenCalledWith(
        'investor.documents',
        'document',
      );
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'investor.bankAccount',
        'bankAccount',
      );
    });

    it('should use leftJoinAndSelect when user is the investor themselves', async () => {
      const investor = makeInvestor();
      const selfUser = { id: investor.id, type: UserType.INVESTOR } as User;
      mockQueryBuilder.getOne.mockResolvedValue(investor);

      await service.findOne(investor.id, selfUser);

      expect(mockQueryBuilder.leftJoinAndSelect).not.toHaveBeenCalledWith(
        'investor.documents',
        'document',
      );
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'investor.bankAccount',
        'bankAccount',
      );
    });

    it('should throw NotFoundException for non-admin, non-owner investor with non-VERIFIED status', async () => {
      const pendingInvestor = makeInvestor({ status: InvestorStatus.PENDING });
      const otherUser = {
        id: 'other-id',
        type: UserType.INVESTOR,
        status: InvestorStatus.PENDING,
      } as unknown as User;
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(
        service.findOne(pendingInvestor.id, otherUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when investor does not exist', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(service.findOne('missing-id', adminUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should throw ForbiddenException when non-admin tries to update another investor', async () => {
      const investor = makeInvestor({ id: 'other-investor-id' });
      const selfUser = {
        id: 'different-id',
        type: UserType.INVESTOR,
      } as User;
      mockQueryBuilder.getOne.mockResolvedValue(investor);

      await expect(
        service.update(
          investor.id,
          {} as UpdateInvestorDto,
          undefined,
          selfUser,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when non-admin investor is PENDING', async () => {
      const investor = makeInvestor({
        id: 'inv-id',
        status: InvestorStatus.PENDING,
      });
      const selfUser = { id: 'inv-id', type: UserType.INVESTOR } as User;
      mockQueryBuilder.getOne.mockResolvedValue(investor);

      await expect(
        service.update(
          investor.id,
          {} as UpdateInvestorDto,
          undefined,
          selfUser,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when non-admin investor is DENIED', async () => {
      const investor = makeInvestor({
        id: 'inv-id',
        status: InvestorStatus.DENIED,
      });
      const selfUser = { id: 'inv-id', type: UserType.INVESTOR } as User;
      mockQueryBuilder.getOne.mockResolvedValue(investor);

      await expect(
        service.update(
          investor.id,
          {} as UpdateInvestorDto,
          undefined,
          selfUser,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should set status to PENDING and update lastCommunication when CORRECTION investor submits for review', async () => {
      const investor = makeInvestor({
        id: 'inv-id',
        status: InvestorStatus.CORRECTION,
      });
      const selfUser = { id: 'inv-id', type: UserType.INVESTOR } as User;
      const dto: UpdateInvestorDto = { status: InvestorStatus.PENDING };
      mockQueryBuilder.getOne.mockResolvedValue(investor);
      mockInvestorRepository.save.mockResolvedValue({ ...investor, ...dto });

      await service.update(investor.id, dto, undefined, selfUser);

      expect(dto.status).toBe(InvestorStatus.PENDING);
      expect(dto.lastCommunication).toBe(
        'Pendiente de revisión por usuario administrador',
      );
    });

    it('should preserve existing status and lastCommunication when CORRECTION investor saves without submitting', async () => {
      const investor = makeInvestor({
        id: 'inv-id',
        status: InvestorStatus.CORRECTION,
        lastCommunication: 'original message',
      });
      const selfUser = { id: 'inv-id', type: UserType.INVESTOR } as User;
      const dto: UpdateInvestorDto = { name: 'New Name' };
      mockQueryBuilder.getOne.mockResolvedValue(investor);
      mockInvestorRepository.save.mockResolvedValue({ ...investor, ...dto });

      await service.update(investor.id, dto, undefined, selfUser);

      expect(dto.status).toBe(InvestorStatus.CORRECTION);
      expect(dto.lastCommunication).toBe('original message');
    });

    it('should clear file and block all protected fields for VERIFIED investor', async () => {
      const investor = makeInvestor({
        id: 'inv-id',
        status: InvestorStatus.VERIFIED,
        name: 'Original Name',
        companyName: 'Original Co',
        investorType: 'individual',
        taxId: '12345678A',
      });
      const selfUser = { id: 'inv-id', type: UserType.INVESTOR } as User;

      const dto: UpdateInvestorDto = {
        name: 'Changed Name',
        companyName: 'Changed Co',
        investorType: 'corporate',
        taxId: '99999999Z',
        status: InvestorStatus.VERIFIED,
      };
      mockQueryBuilder.getOne.mockResolvedValue(investor);
      mockInvestorRepository.save.mockResolvedValue(investor);

      await service.update(investor.id, dto, mockFile, selfUser);

      expect(dto.name).toBe('Original Name');
      expect(dto.companyName).toBe('Original Co');
      expect(dto.investorType).toBe('individual');
      expect(dto.taxId).toBe('12345678A');

      expect(mockDocumentService.create).not.toHaveBeenCalled();
    });

    it('should nullify file for admin update', async () => {
      const investor = makeInvestor({ id: 'inv-id' });
      const dto: UpdateInvestorDto = { name: 'Updated' };
      mockQueryBuilder.getOne.mockResolvedValue(investor);
      mockInvestorRepository.save.mockResolvedValue(investor);

      await service.update(investor.id, dto, mockFile, adminUser);

      expect(mockDocumentService.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when passwords are provided but do not match', async () => {
      const investor = makeInvestor({ id: 'inv-id' });
      const dto: UpdateInvestorDto = {
        password: 'abc',
        passwordRepeat: 'xyz',
      };
      mockQueryBuilder.getOne.mockResolvedValue(investor);

      await expect(
        service.update(investor.id, dto, undefined, adminUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when investor uploads file without taxId', async () => {
      const investor = makeInvestor({
        id: 'inv-id',
        status: InvestorStatus.CORRECTION,
      });
      const selfUser = { id: 'inv-id', type: UserType.INVESTOR } as User;
      const dto: UpdateInvestorDto = {};
      mockQueryBuilder.getOne.mockResolvedValue(investor);

      await expect(
        service.update(investor.id, dto, mockFile, selfUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('should save and return the updated investor on happy path', async () => {
      const investor = makeInvestor({ id: 'inv-id' });
      const dto: UpdateInvestorDto = { name: 'Updated' };
      const updatedInvestor = { ...investor, name: 'Updated' };
      mockQueryBuilder.getOne.mockResolvedValue(investor);
      mockInvestorRepository.save.mockResolvedValue(updatedInvestor);

      const result = await service.update(
        investor.id,
        dto,
        undefined,
        adminUser,
      );

      expect(mockInvestorRepository.save).toHaveBeenCalled();
      expect(result).toBe(updatedInvestor);
    });
  });

  describe('remove', () => {
    it('should throw ForbiddenException when non-admin tries to remove another investor', async () => {
      const investor = makeInvestor({ id: 'inv-id' });
      const otherUser = { id: 'other-id', type: UserType.INVESTOR } as User;
      mockQueryBuilder.getOne.mockResolvedValue(investor);

      await expect(service.remove(investor.id, otherUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should call softDelete by default', async () => {
      const investor = makeInvestor({ id: 'inv-id' });
      mockQueryBuilder.getOne.mockResolvedValue(investor);
      mockInvestorRepository.softDelete.mockResolvedValue(undefined);

      await service.remove(investor.id, adminUser);

      expect(mockInvestorRepository.softDelete).toHaveBeenCalledWith(
        investor.id,
      );
    });

    it('should call delete when useSoft is false', async () => {
      const investor = makeInvestor({ id: 'inv-id' });
      mockQueryBuilder.getOne.mockResolvedValue(investor);
      mockInvestorRepository.delete.mockResolvedValue(undefined);

      await service.remove(investor.id, adminUser, false);

      expect(mockInvestorRepository.delete).toHaveBeenCalledWith(investor.id);
    });
  });
});
