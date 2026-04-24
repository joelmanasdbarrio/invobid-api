import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { Admin } from './entities/admin.entity';

const mockAdminService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('AdminController', () => {
  let controller: AdminController;

  const mockAdminUser = { id: 'admin-uuid' } as Admin;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [{ provide: AdminService, useValue: mockAdminService }],
    }).compile();

    controller = module.get<AdminController>(AdminController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return status and list of admins', async () => {
      const admins = [{ id: '1', email: 'a@example.com' }];
      mockAdminService.findAll.mockResolvedValue(admins);

      const result = await controller.findAll();

      expect(result).toEqual({ status: 'success', data: admins });
    });
  });

  describe('findOne', () => {
    const id = 'admin-uuid';
    const admin = { id, email: 'a@example.com' };

    it('should call adminService.findOne with the correct id', async () => {
      mockAdminService.findOne.mockResolvedValue(admin);

      await controller.findOne(id);

      expect(mockAdminService.findOne).toHaveBeenCalledWith(id);
    });

    it('should return status and admin data', async () => {
      mockAdminService.findOne.mockResolvedValue(admin);

      const result = await controller.findOne(id);

      expect(result).toEqual({ status: 'success', data: admin });
    });
  });

  describe('update', () => {
    const id = 'admin-uuid';
    const dto: UpdateAdminDto = { name: 'Updated Name' };

    it('should call adminService.update with the correct id and dto', async () => {
      mockAdminService.update.mockResolvedValue({ id, name: 'Updated Name' });

      await controller.update(id, dto, mockAdminUser);

      expect(mockAdminService.update).toHaveBeenCalledWith(id, dto, mockAdminUser);
    });

    it('should return status and updated admin data', async () => {
      mockAdminService.update.mockResolvedValue({ id, name: 'Updated Name' });

      const result = await controller.update(id, dto, mockAdminUser);

      expect(result).toMatchObject({ status: 'success', data: { id } });
    });

    it('should strip password from the returned admin data', async () => {
      mockAdminService.update.mockResolvedValue({
        id,
        name: 'Updated Name',
        password: 'hashed-password',
      });

      const result = await controller.update(id, dto, mockAdminUser);

      expect((result.data as Record<string, unknown>).password).toBeUndefined();
    });
  });

  describe('remove', () => {
    const id = 'admin-uuid';

    it('should call adminService.remove with the correct id', async () => {
      mockAdminService.remove.mockResolvedValue(undefined);

      await controller.remove(id, mockAdminUser);

      expect(mockAdminService.remove).toHaveBeenCalledWith(id, mockAdminUser);
    });

    it('should return status success', async () => {
      mockAdminService.remove.mockResolvedValue(undefined);

      const result = await controller.remove(id, mockAdminUser);

      expect(result).toEqual({ status: 'success' });
    });
  });
});
