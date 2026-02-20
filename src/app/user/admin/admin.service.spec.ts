import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import 'src/utils/object.extensions';
import { UserType } from '../common/enums/user-type.enum';
import { AdminService } from './admin.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { Admin } from './entities/admin.entity';

jest.mock('bcrypt');
const bcryptHash = bcrypt.hash as jest.MockedFunction<typeof bcrypt.hash>;

const mockAdminRepository = {
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  merge: jest.fn(),
  softDelete: jest.fn(),
};

describe('AdminService', () => {
  let service: AdminService;

  beforeEach(async () => {
    jest.clearAllMocks();
    bcryptHash.mockResolvedValue('hashed-password' as never);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: getRepositoryToken(Admin), useValue: mockAdminRepository },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto: CreateAdminDto = {
      email: 'admin@example.com',
      password: 'password123',
      passwordRepeat: 'password123',
      name: 'Admin User',
    };

    it('should throw BadRequestException when passwords do not match', async () => {
      await expect(
        service.create({ ...createDto, passwordRepeat: 'different' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should hash the password and save the admin with UserType.ADMIN', async () => {
      const savedAdmin = { id: '1', ...createDto, type: UserType.ADMIN };
      mockAdminRepository.create.mockReturnValue(savedAdmin);
      mockAdminRepository.save.mockResolvedValue(savedAdmin);

      const result = await service.create(createDto);

      expect(bcryptHash).toHaveBeenCalledWith('password123', 10);
      expect(mockAdminRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: UserType.ADMIN,
          password: 'hashed-password',
        }),
      );
      expect(result).toBe(savedAdmin);
    });

    it('should throw BadRequestException on duplicate email (DB error 23505)', async () => {
      mockAdminRepository.create.mockReturnValue({});
      mockAdminRepository.save.mockRejectedValue({ code: '23505' });

      await expect(service.create(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAll', () => {
    it('should return all admins', async () => {
      const admins = [{ id: '1' }, { id: '2' }];
      mockAdminRepository.find.mockResolvedValue(admins);

      expect(await service.findAll()).toBe(admins);
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException when admin does not exist', async () => {
      mockAdminRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return the admin when found', async () => {
      const admin = { id: '1', email: 'admin@example.com' };
      mockAdminRepository.findOne.mockResolvedValue(admin);

      expect(await service.findOne('1')).toBe(admin);
    });
  });

  describe('update', () => {
    const id = 'admin-uuid';
    const existingAdmin = { id, email: 'admin@example.com', name: 'Admin' };

    beforeEach(() => {
      mockAdminRepository.findOne.mockResolvedValue(existingAdmin);
    });

    it('should throw BadRequestException when passwords provided but do not match', async () => {
      const dto: UpdateAdminDto = {
        password: 'abc123',
        passwordRepeat: 'xyz789',
      };

      await expect(service.update(id, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should hash the password when both fields are provided and match', async () => {
      const dto: UpdateAdminDto = {
        password: 'newpass',
        passwordRepeat: 'newpass',
      };
      mockAdminRepository.merge.mockReturnValue({ ...existingAdmin });
      mockAdminRepository.save.mockResolvedValue(undefined);

      await service.update(id, dto);

      expect(bcryptHash).toHaveBeenCalledWith('newpass', 10);
    });

    it('should throw NotFoundException when admin does not exist', async () => {
      mockAdminRepository.findOne.mockResolvedValue(null);

      await expect(service.update('missing-id', { name: 'X' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should merge and save then return the updated admin', async () => {
      const dto: UpdateAdminDto = { name: 'Updated' };
      const merged = { ...existingAdmin, name: 'Updated' };
      mockAdminRepository.merge.mockReturnValue(merged);
      mockAdminRepository.save.mockResolvedValue(undefined);

      const result = await service.update(id, dto);

      expect(mockAdminRepository.merge).toHaveBeenCalled();
      expect(mockAdminRepository.save).toHaveBeenCalledWith(merged);
      expect(result).toMatchObject({ id, name: 'Updated' });
    });

    it('should throw BadRequestException on duplicate email (DB error 23505)', async () => {
      const dto: UpdateAdminDto = { email: 'taken@example.com' };
      mockAdminRepository.merge.mockReturnValue({ ...existingAdmin });
      mockAdminRepository.save.mockRejectedValue({ code: '23505' });

      await expect(service.update(id, dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('remove', () => {
    it('should throw NotFoundException when admin does not exist', async () => {
      mockAdminRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should call softDelete with the correct id', async () => {
      const id = 'admin-uuid';
      mockAdminRepository.findOne.mockResolvedValue({ id });
      mockAdminRepository.softDelete.mockResolvedValue(undefined);

      await service.remove(id);

      expect(mockAdminRepository.softDelete).toHaveBeenCalledWith(id);
    });
  });
});
