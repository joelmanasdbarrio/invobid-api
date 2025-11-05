import { Injectable } from '@nestjs/common';
import { CreateInvestorDto } from './dto/create-investor.dto';
import { UpdateInvestorDto } from './dto/update-investor.dto';

@Injectable()
export class InvestorService {
  create(createInvestorDto: CreateInvestorDto) {
    return 'This action adds a new investor';
  }

  findAll() {
    return `This action returns all investor`;
  }

  findOne(id: number) {
    return `This action returns a #${id} investor`;
  }

  update(id: number, updateInvestorDto: UpdateInvestorDto) {
    return `This action updates a #${id} investor`;
  }

  remove(id: number) {
    return `This action removes a #${id} investor`;
  }
}
