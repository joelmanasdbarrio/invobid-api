import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileTypePipe } from 'src/pipes/file-type.pipe';
import { CreateInvestorDto } from './dto/create-investor.dto';
import { UpdateInvestorDto } from './dto/update-investor.dto';
import { InvestorService } from './investor.service';

@Controller('investors')
export class InvestorController {
  constructor(private readonly investorService: InvestorService) {}

  @Post()
  @UseInterceptors(FileInterceptor('document'))
  create(
    @Body() createInvestorDto: CreateInvestorDto,
    @UploadedFile(FileTypePipe) file: Express.Multer.File,
  ) {
    return this.investorService.create(createInvestorDto, file);
  }

  @Get()
  findAll() {
    return this.investorService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.investorService.findOne(id);
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('document'))
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateInvestorDto: UpdateInvestorDto,
    @UploadedFile(FileTypePipe) file: Express.Multer.File,
  ) {
    return this.investorService.update(id, updateInvestorDto, file);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.investorService.remove(id);
  }
}
