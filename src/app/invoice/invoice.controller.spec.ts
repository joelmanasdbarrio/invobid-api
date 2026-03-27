import { Test, TestingModule } from '@nestjs/testing';
import { User } from '../user/common/entities/user.entity';
import { UserType } from '../user/common/enums/user-type.enum';
import { Investor } from '../user/investor/entities/investor.entity';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { GetInvoicesDto } from './dto/get-invoices.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { InvoiceController } from './invoice.controller';
import { InvoiceService } from './invoice.service';

const mockInvoiceService = {
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

const mockFile = { originalname: 'invoice.pdf' } as Express.Multer.File;

describe('InvoiceController', () => {
  let controller: InvoiceController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvoiceController],
      providers: [{ provide: InvoiceService, useValue: mockInvoiceService }],
    }).compile();

    controller = module.get<InvoiceController>(InvoiceController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    const dto: CreateInvoiceDto = {
      debtorId: 'debtor-uuid',
      amount: 5000,
      dueDate: '2026-06-01',
      invoiceUid: 'B12345678-F001-00001234-20260216-A9K3',
    };
    const invoice = { id: 'invoice-uuid', amount: 5000 };

    it('should call invoiceService.create with dto, file and user', async () => {
      mockInvoiceService.create.mockResolvedValue(invoice);

      await controller.create(dto, mockFile, mockUser as Investor);

      expect(mockInvoiceService.create).toHaveBeenCalledWith(
        dto,
        mockFile,
        mockUser,
      );
    });

    it('should return status and created invoice data', async () => {
      mockInvoiceService.create.mockResolvedValue(invoice);

      const result = await controller.create(
        dto,
        mockFile,
        mockUser as Investor,
      );

      expect(result).toEqual({ status: 'success', data: invoice });
    });
  });

  describe('findAll', () => {
    const invoices = [{ id: 'inv-1' }, { id: 'inv-2' }];

    beforeEach(() => {
      mockInvoiceService.findAll.mockResolvedValue({
        data: invoices,
        total: 2,
        page: 1,
        limit: 10,
      });
    });

    it('should call invoiceService.findAll with defaults when page/limit are absent', async () => {
      await controller.findAll({} as GetInvoicesDto, mockUser);

      expect(mockInvoiceService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, limit: 10 }),
        mockUser,
      );
    });

    it('should call invoiceService.findAll with provided page and limit', async () => {
      mockInvoiceService.findAll.mockResolvedValue({
        data: invoices,
        total: 2,
        page: 2,
        limit: 5,
      });

      await controller.findAll(
        { page: 2, limit: 5 } as GetInvoicesDto,
        mockUser,
      );

      expect(mockInvoiceService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2, limit: 5 }),
        mockUser,
      );
    });

    it('should return status, data and _metadata', async () => {
      const result = await controller.findAll({} as GetInvoicesDto, mockUser);

      expect(result).toEqual({
        status: 'success',
        data: invoices,
        _metadata: { total: 2, length: invoices.length, page: 1, limit: 10 },
      });
    });
  });

  describe('findOne', () => {
    const id = 'invoice-uuid';
    const invoice = { id, amount: 5000 };

    it('should call invoiceService.findOne with id and user', async () => {
      mockInvoiceService.findOne.mockResolvedValue(invoice);

      await controller.findOne(id, mockUser);

      expect(mockInvoiceService.findOne).toHaveBeenCalledWith(id, mockUser);
    });

    it('should return status and invoice data', async () => {
      mockInvoiceService.findOne.mockResolvedValue(invoice);

      const result = await controller.findOne(id, mockUser);

      expect(result).toEqual({ status: 'success', data: invoice });
    });
  });

  describe('update', () => {
    const id = 'invoice-uuid';
    const dto: UpdateInvoiceDto = { amount: 9000 };
    const updatedInvoice = { id, amount: 9000 };

    it('should call invoiceService.update with id, dto, file and user', async () => {
      mockInvoiceService.update.mockResolvedValue(updatedInvoice);

      await controller.update(id, dto, mockFile, mockUser);

      expect(mockInvoiceService.update).toHaveBeenCalledWith(
        id,
        dto,
        mockFile,
        mockUser,
      );
    });

    it('should return status and updated invoice data', async () => {
      mockInvoiceService.update.mockResolvedValue(updatedInvoice);

      const result = await controller.update(id, dto, mockFile, mockUser);

      expect(result).toEqual({ status: 'success', data: updatedInvoice });
    });
  });

  describe('remove', () => {
    const id = 'invoice-uuid';

    it('should call invoiceService.remove with id and user', async () => {
      mockInvoiceService.remove.mockResolvedValue(undefined);

      await controller.remove(id, mockUser);

      expect(mockInvoiceService.remove).toHaveBeenCalledWith(id, mockUser);
    });

    it('should return status success', async () => {
      mockInvoiceService.remove.mockResolvedValue(undefined);

      const result = await controller.remove(id, mockUser);

      expect(result).toEqual({ status: 'success' });
    });
  });
});
