import { Injectable } from '@nestjs/common';
import { User } from '../user/common/entities/user.entity';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';

@Injectable()
export class InvoiceService {
  create(createInvoiceDto: CreateInvoiceDto) {
    return 'This action adds a new invoice';
  }

  findAll(user: User) {
    return `This action returns all invoice`;
  }

  findOne(id: string, user: User) {
    return `This action returns a #${id} invoice`;
  }

  update(id: string, updateInvoiceDto: UpdateInvoiceDto, user: User) {
    return `This action updates a #${id} invoice`;
  }

  remove(id: string, user: User) {
    return `This action removes a #${id} invoice`;
  }
}
