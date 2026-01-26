import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice } from './entities/invoice.entity';
import { InvoiceStatus } from './enums/invoice-status.enum';

@Injectable()
export class InvoiceLookupService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
  ) {}

  async countPendingInvoices(): Promise<number> {
    return await this.invoiceRepository.count({
      where: { status: InvoiceStatus.PENDING },
    });
  }
}
