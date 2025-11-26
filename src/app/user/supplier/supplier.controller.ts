import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import {
  FileFieldsInterceptor,
  FileInterceptor,
} from '@nestjs/platform-express';
import { FilesTypePipe } from 'src/pipes/file-type.pipe';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SupplierService } from './supplier.service';

@Controller('suppliers')
export class SupplierController {
  constructor(private readonly supplierService: SupplierService) {}

  @Post()
  @UseInterceptors(FileInterceptor('document'))
  create(
    @Body() createSupplierDto: CreateSupplierDto,
    @UploadedFiles(FilesTypePipe)
    files: { document: Express.Multer.File[]; logo: Express.Multer.File[] },
  ) {
    return this.supplierService.create(createSupplierDto, files);
  }

  @Get()
  findAll() {
    return this.supplierService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.supplierService.findOne(id);
  }

  @Patch(':id')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'document', maxCount: 1 },
      { name: 'logo', maxCount: 1 },
    ]),
  )
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateSupplierDto: UpdateSupplierDto,
    @UploadedFiles(FilesTypePipe)
    files?: { document?: Express.Multer.File[]; logo?: Express.Multer.File[] },
  ) {
    return this.supplierService.update(id, updateSupplierDto, files);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.supplierService.remove(id);
  }
}
