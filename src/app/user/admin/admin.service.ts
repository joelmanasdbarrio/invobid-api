import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { UserType } from 'src/app/user/common/enums/user-type.enum';
import 'src/utils/object.extensions';
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

    try {
      createAdminDto.password = await bcrypt.hash(createAdminDto.password, 10);

      return await this.adminRepository.save({
        ...createAdminDto,
        type: UserType.ADMIN,
      });
    } catch (error) {
      console.error(error);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (error.code === '23505') {
        throw new BadRequestException(
          `User with email '${createAdminDto.email}' already exists`,
        );
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      throw new InternalServerErrorException(error.message);
    }
  }

  async findAll() {
    return await this.adminRepository.find();
  }

  async findOne(id: string) {
    const admin = await this.adminRepository.findOne({ where: { id } });

    if (!admin) throw new NotFoundException(`Admin with ID '${id}' not found`);

    return admin;
  }

  async update(id: string, updateAdminDto: UpdateAdminDto, user: Admin) {
    const admin = await this.findOne(id);

    if (user.id !== admin.id) {
      throw new ForbiddenException(
        "You don't have permission to perform this action",
      );
    }

    if (updateAdminDto.password && updateAdminDto.passwordRepeat) {
      if (updateAdminDto.password !== updateAdminDto.passwordRepeat) {
        throw new BadRequestException('Passwords do not match');
      }
      updateAdminDto.password = await bcrypt.hash(updateAdminDto.password, 10);
    }

    const updatedAdmin = this.adminRepository.merge(
      admin,
      updateAdminDto.removeUndefined(),
    );

    try {
      await this.adminRepository.save(updatedAdmin);
    } catch (error) {
      console.error(error);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (error.code === '23505') {
        throw new BadRequestException(
          `Admin with email '${updateAdminDto.email}' already exists`,
        );
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      throw new InternalServerErrorException(error.message);
    }

    return { ...admin, ...updateAdminDto.removeUndefined() };
  }

  async remove(id: string, user: Admin) {
    const admin = await this.findOne(id);

    if (user.id !== admin.id) {
      throw new ForbiddenException(
        "You don't have permission to perform this action",
      );
    }

    return this.adminRepository.softDelete(id);
  }
}
