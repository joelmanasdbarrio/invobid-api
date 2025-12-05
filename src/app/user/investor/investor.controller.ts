import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileTypePipe } from 'src/pipes/file-type.pipe';
import { UpdateInvestorDto } from './dto/update-investor.dto';
import { InvestorService } from './investor.service';

@Controller('investors')
export class InvestorController {
  constructor(private readonly investorService: InvestorService) {}

  @Get()
  async findAll() {
    const res = await this.investorService.findAll();
    return {
      status: 'success',
      data: res,
    };
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const res = await this.investorService.findOne(id);
    return {
      status: 'success',
      data: res,
    };
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('document'))
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateInvestorDto: UpdateInvestorDto,
    @UploadedFile(FileTypePipe) file: Express.Multer.File,
  ) {
    const investor = await this.investorService.update(
      id,
      updateInvestorDto,
      file,
    );

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...safeUser } = investor;

    return {
      status: 'success',
      data: safeUser,
    };
  }

  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.investorService.remove(id);
    return {
      status: 'success',
    };
  }
}
