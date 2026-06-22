import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DebtorModule } from '../debtor/debtor.module';
import { DocumentModule } from '../document/document.module';
import { Invoice } from './entities/invoice.entity';
import { InvoiceLookupController } from './invoice-lookup.controller';
import { InvoiceLookupService } from './invoice-lookup.service';
import { InvoiceController } from './invoice.controller';
import { InvoiceService } from './invoice.service';
import { RatingService } from 'src/app/invoice/services/rating.service';

@Module({
  imports: [TypeOrmModule.forFeature([Invoice]), DocumentModule, DebtorModule],
  controllers: [InvoiceController, InvoiceLookupController],
  providers: [InvoiceService, InvoiceLookupService, RatingService],
  exports: [InvoiceService],
})
export class InvoiceModule {}
