import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { FilesTypePipe } from 'src/pipes/file-type.pipe';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SupplierService } from './supplier.service';

@Controller('suppliers')
export class SupplierController {
  constructor(private readonly supplierService: SupplierService) {}

  @Get()
  async findAll() {
    const res = await this.supplierService.findAll();
    return {
      status: 'success',
      data: res,
    };
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const res = await this.supplierService.findOne(id);
    return {
      status: 'success',
      data: res,
    };
  }

  @Patch(':id')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'document', maxCount: 1 },
      { name: 'logo', maxCount: 1 },
    ]),
  )
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateSupplierDto: UpdateSupplierDto,
    @UploadedFiles(FilesTypePipe)
    files?: { document?: Express.Multer.File[]; logo?: Express.Multer.File[] },
  ) {
    const supplier = await this.supplierService.update(
      id,
      updateSupplierDto,
      files,
    );

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...safeUser } = supplier;

    return {
      status: 'success',
      data: safeUser,
    };
  }

  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.supplierService.remove(id);
    return {
      status: 'success',
    };
  }
}
