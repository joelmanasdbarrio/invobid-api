import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
} from '@nestjs/common';
import { Auth } from '../auth/decorators/auth.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserType } from '../common/enums/user-type.enum';
import { AdminService } from './admin.service';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { Admin } from './entities/admin.entity';

@Controller('admins')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  @Auth([UserType.ADMIN])
  async findAll() {
    const res = await this.adminService.findAll();
    return {
      status: 'success',
      data: res,
    };
  }

  @Get(':id')
  @Auth([UserType.ADMIN])
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const res = await this.adminService.findOne(id);
    return {
      status: 'success',
      data: res,
    };
  }

  @Patch(':id')
  @Auth([UserType.ADMIN])
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateAdminDto: UpdateAdminDto,
    @GetUser() user: Admin,
  ) {
    const admin = await this.adminService.update(id, updateAdminDto, user);

    delete (admin as Partial<typeof admin>).password;

    return {
      status: 'success',
      data: admin,
    };
  }

  @Delete(':id')
  @Auth([UserType.ADMIN])
  async remove(@Param('id', ParseUUIDPipe) id: string, @GetUser() user: Admin) {
    await this.adminService.remove(id, user);
    return {
      status: 'success',
    };
  }
}
