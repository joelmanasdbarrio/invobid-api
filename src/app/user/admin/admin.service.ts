import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { Admin } from './entities/admin.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
  ) {}

  async create(createAdminDto: CreateAdminDto) {
    if (createAdminDto.password !== createAdminDto.passwordRepeat) {
      throw new BadRequestException('Passwords do not match');
    }

    createAdminDto.password = await bcrypt.hash(createAdminDto.password, 10);

    try {
      const admin = this.adminRepository.create(createAdminDto);

      return await this.adminRepository.save(admin);
    } catch (error) {
      console.error(error);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (error.code === '23505') {
        throw new BadRequestException(
          `User with email '${createAdminDto.email}' already exists`,
        );
      }
    }
  }

  findAll() {
    return this.adminRepository.find();
  }

  async findOne(id: string) {
    const admin = await this.adminRepository.findOne({ where: { id } });

    if (!admin) throw new NotFoundException(`Admin with ID '${id}' not found`);

    return admin;
  }

  async update(id: string, updateAdminDto: UpdateAdminDto) {
    if (updateAdminDto.password && updateAdminDto.passwordRepeat) {
      if (updateAdminDto.password !== updateAdminDto.passwordRepeat) {
        throw new BadRequestException('Passwords do not match');
      }
    }

    const admin = await this.findOne(id);

    try {
      await this.adminRepository.update(id, updateAdminDto);
    } catch (error) {
      console.error(error);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (error.code === '23505') {
        throw new BadRequestException(
          `Admin with email '${updateAdminDto.email}' already exists`,
        );
      }
    }

    return { ...admin, ...updateAdminDto.removeUndefined() };
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.adminRepository.softDelete(id);
  }
}
