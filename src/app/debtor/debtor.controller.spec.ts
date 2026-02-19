import { Test, TestingModule } from '@nestjs/testing';
import { User } from 'src/app/user/common/entities/user.entity';
import { UserType } from 'src/app/user/common/enums/user-type.enum';
import { Investor } from 'src/app/user/investor/entities/investor.entity';
import { DebtorController } from './debtor.controller';
import { DebtorService } from './debtor.service';
import { CreateDebtorDto } from './dto/create-debtor.dto';
import { GetDebtorsDto } from './dto/get-debtors.dto';
import { UpdateDebtorDto } from './dto/update-debtor.dto';

const mockDebtorService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

const mockUser = {
  id: 'user-uuid',
  email: 'user@example.com',
  type: UserType.INVESTOR,
} as User;

const mockFiles: { [key: string]: Express.Multer.File[] } = {
  modelo111: [{ originalname: 'modelo111.pdf' } as Express.Multer.File],
  modelo303: [{ originalname: 'modelo303.pdf' } as Express.Multer.File],
};

describe('DebtorController', () => {
  let controller: DebtorController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DebtorController],
      providers: [{ provide: DebtorService, useValue: mockDebtorService }],
    }).compile();

    controller = module.get<DebtorController>(DebtorController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    const dto: CreateDebtorDto = {
      email: 'debtor@example.com',
      phoneNumber: '+34600000000',
      companyName: 'Debtor Co',
      taxId: 'B12345678',
      modelo111Csv: 'csv-111',
      modelo303Csv: 'csv-303',
    };
    const debtor = { id: 'debtor-uuid', companyName: 'Debtor Co' };

    it('should call debtorService.create with dto, files and investor', async () => {
      mockDebtorService.create.mockResolvedValue(debtor);

      await controller.create(dto, mockFiles, mockUser as Investor);

      expect(mockDebtorService.create).toHaveBeenCalledWith(
        dto,
        mockFiles,
        mockUser,
      );
    });

    it('should return status and created debtor data', async () => {
      mockDebtorService.create.mockResolvedValue(debtor);

      const result = await controller.create(
        dto,
        mockFiles,
        mockUser as Investor,
      );

      expect(result).toEqual({ status: 'success', data: debtor });
    });
  });

  describe('findAll', () => {
    const debtors = [{ id: 'debtor-1' }, { id: 'debtor-2' }];

    beforeEach(() => {
      mockDebtorService.findAll.mockResolvedValue({
        data: debtors,
        total: 2,
        page: 1,
        limit: 10,
      });
    });

    it('should call debtorService.findAll with defaults when page/limit are absent', async () => {
      await controller.findAll({} as GetDebtorsDto, mockUser);

      expect(mockDebtorService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, limit: 10 }),
        mockUser,
      );
    });

    it('should call debtorService.findAll with provided page and limit', async () => {
      mockDebtorService.findAll.mockResolvedValue({
        data: debtors,
        total: 2,
        page: 2,
        limit: 5,
      });

      await controller.findAll(
        { page: 2, limit: 5 } as GetDebtorsDto,
        mockUser,
      );

      expect(mockDebtorService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2, limit: 5 }),
        mockUser,
      );
    });

    it('should return status, data and _metadata', async () => {
      const result = await controller.findAll({} as GetDebtorsDto, mockUser);

      expect(result).toEqual({
        status: 'success',
        data: debtors,
        _metadata: { total: 2, length: debtors.length, page: 1, limit: 10 },
      });
    });
  });

  describe('findOne', () => {
    const id = 'debtor-uuid';
    const debtor = { id, companyName: 'Debtor Co' };

    it('should call debtorService.findOne with id and user', async () => {
      mockDebtorService.findOne.mockResolvedValue(debtor);

      await controller.findOne(id, mockUser);

      expect(mockDebtorService.findOne).toHaveBeenCalledWith(id, mockUser);
    });

    it('should return status and debtor data', async () => {
      mockDebtorService.findOne.mockResolvedValue(debtor);

      const result = await controller.findOne(id, mockUser);

      expect(result).toEqual({ status: 'success', data: debtor });
    });
  });

  describe('update', () => {
    const id = 'debtor-uuid';
    const dto: UpdateDebtorDto = { companyName: 'Updated Co' };
    const updatedDebtor = { id, companyName: 'Updated Co' };

    it('should call debtorService.update with id, dto, files and user', async () => {
      mockDebtorService.update.mockResolvedValue(updatedDebtor);

      await controller.update(id, dto, mockFiles, mockUser);

      expect(mockDebtorService.update).toHaveBeenCalledWith(
        id,
        dto,
        mockFiles,
        mockUser,
      );
    });

    it('should return status and updated debtor data', async () => {
      mockDebtorService.update.mockResolvedValue(updatedDebtor);

      const result = await controller.update(id, dto, mockFiles, mockUser);

      expect(result).toEqual({ status: 'success', data: updatedDebtor });
    });
  });

  describe('remove', () => {
    const id = 'debtor-uuid';

    it('should call debtorService.remove with id and user', async () => {
      mockDebtorService.remove.mockResolvedValue(undefined);

      await controller.remove(id, mockUser);

      expect(mockDebtorService.remove).toHaveBeenCalledWith(id, mockUser);
    });

    it('should return status success', async () => {
      mockDebtorService.remove.mockResolvedValue(undefined);

      const result = await controller.remove(id, mockUser);

      expect(result).toEqual({ status: 'success' });
    });
  });
});
