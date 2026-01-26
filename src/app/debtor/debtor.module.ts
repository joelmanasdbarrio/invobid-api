import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentModule } from 'src/app/document/document.module';
import { DebtorLookupController } from './debtor-lookup.controller';
import { DebtorLookupService } from './debtor-lookup.service';
import { DebtorController } from './debtor.controller';
import { DebtorService } from './debtor.service';
import { Debtor } from './entities/debtor.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Debtor]), DocumentModule],
  controllers: [DebtorController, DebtorLookupController],
  providers: [DebtorService, DebtorLookupService],
  exports: [DebtorService],
})
export class DebtorModule {}
