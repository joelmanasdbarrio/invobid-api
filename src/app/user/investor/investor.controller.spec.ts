import { Test, TestingModule } from '@nestjs/testing';
import { User } from '../common/entities/user.entity';
import { UserType } from '../common/enums/user-type.enum';
import { GetInvestorsDto } from './dto/get-investors.dto';
import { UpdateInvestorDto } from './dto/update-investor.dto';
import { InvestorStatus } from './enums/investor-status.enum';
import { InvestorController } from './investor.controller';
import { InvestorService } from './investor.service';

const mockInvestorService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

const mockUser = {
  id: 'user-uuid',
  email: 'user@example.com',
  type: UserType.ADMIN,
} as User;

describe('InvestorController', () => {
  let controller: InvestorController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvestorController],
      providers: [{ provide: InvestorService, useValue: mockInvestorService }],
    }).compile();

    controller = module.get<InvestorController>(InvestorController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    const investors = [{ id: '1' }, { id: '2' }];

    beforeEach(() => {
      mockInvestorService.findAll.mockResolvedValue({
        data: investors,
        total: 2,
        page: 1,
        limit: 10,
      });
    });

    it('should call investorService.findAll with defaults when page/limit are absent', async () => {
      await controller.findAll({} as GetInvestorsDto, mockUser);

      expect(mockInvestorService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, limit: 10 }),
        mockUser,
      );
    });

    it('should call investorService.findAll with provided page and limit', async () => {
      await controller.findAll(
        { page: 2, limit: 5 } as GetInvestorsDto,
        mockUser,
      );

      expect(mockInvestorService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2, limit: 5 }),
        mockUser,
      );
    });

    it('should return status, data and _metadata', async () => {
      const result = await controller.findAll({} as GetInvestorsDto, mockUser);

      expect(result).toEqual({
        status: 'success',
        data: investors,
        _metadata: { total: 2, length: investors.length, page: 1, limit: 10 },
      });
    });
  });

  describe('findOne', () => {
    const id = 'investor-uuid';
    const investor = { id, email: 'investor@example.com' };

    it('should call investorService.findOne with id and user', async () => {
      mockInvestorService.findOne.mockResolvedValue(investor);

      await controller.findOne(id, mockUser);

      expect(mockInvestorService.findOne).toHaveBeenCalledWith(id, mockUser);
    });

    it('should return status and investor data', async () => {
      mockInvestorService.findOne.mockResolvedValue(investor);

      const result = await controller.findOne(id, mockUser);

      expect(result).toEqual({ status: 'success', data: investor });
    });
  });

  describe('update', () => {
    const id = 'investor-uuid';
    const dto: UpdateInvestorDto = { name: 'Updated Name' };
    const mockFile = { originalname: 'doc.pdf' } as Express.Multer.File;

    it('should call investorService.update with id, dto, file and user', async () => {
      mockInvestorService.update.mockResolvedValue({
        id,
        name: 'Updated Name',
      });

      await controller.update(id, dto, mockFile, mockUser);

      expect(mockInvestorService.update).toHaveBeenCalledWith(
        id,
        dto,
        mockFile,
        mockUser,
      );
    });

    it('should return status and updated investor data', async () => {
      mockInvestorService.update.mockResolvedValue({
        id,
        name: 'Updated Name',
      });

      const result = await controller.update(id, dto, mockFile, mockUser);

      expect(result).toMatchObject({ status: 'success', data: { id } });
    });

    it('should strip password from the returned investor data', async () => {
      mockInvestorService.update.mockResolvedValue({
        id,
        name: 'Updated Name',
        password: 'hashed-password',
        status: InvestorStatus.VERIFIED,
      });

      const result = await controller.update(id, dto, mockFile, mockUser);

      expect((result.data as Record<string, unknown>).password).toBeUndefined();
    });
  });

  describe('remove', () => {
    const id = 'investor-uuid';

    it('should call investorService.remove with id and user', async () => {
      mockInvestorService.remove.mockResolvedValue(undefined);

      await controller.remove(id, mockUser);

      expect(mockInvestorService.remove).toHaveBeenCalledWith(id, mockUser);
    });

    it('should return status success', async () => {
      mockInvestorService.remove.mockResolvedValue(undefined);

      const result = await controller.remove(id, mockUser);

      expect(result).toEqual({ status: 'success' });
    });
  });
});
