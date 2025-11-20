import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CreateInvestorDto } from './dto/create-investor.dto';
import { UpdateInvestorDto } from './dto/update-investor.dto';
import { InvestorService } from './investor.service';

@Controller('investor')
export class InvestorController {
  constructor(private readonly investorService: InvestorService) {}

  @Post()
  create(@Body() createInvestorDto: CreateInvestorDto) {
    return this.investorService.create(createInvestorDto);
  }

  @Get()
  findAll() {
    return this.investorService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.investorService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateInvestorDto: UpdateInvestorDto,
  ) {
    return this.investorService.update(+id, updateInvestorDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.investorService.remove(+id);
  }
}
