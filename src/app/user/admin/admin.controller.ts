import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { UpdateAdminDto } from './dto/update-admin.dto';

@Controller('admins')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  async findAll() {
    const res = await this.adminService.findAll();
    return {
      status: 'success',
      data: res,
    };
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const res = await this.adminService.findOne(id);
    return {
      status: 'success',
      data: res,
    };
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateAdminDto: UpdateAdminDto,
  ) {
    const admin = await this.adminService.update(id, updateAdminDto);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...safeUser } = admin;

    return {
      status: 'success',
      data: safeUser,
    };
  }

  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.adminService.remove(id);
    return {
      status: 'success',
    };
  }
}
