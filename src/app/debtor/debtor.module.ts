import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DebtorController } from './debtor.controller';
import { DebtorService } from './debtor.service';
import { Debtor } from './entities/debtor.entity';
import { DocumentModule } from 'src/app/document/document.module';

@Module({
  imports: [TypeOrmModule.forFeature([Debtor]), DocumentModule],
  controllers: [DebtorController],
  providers: [DebtorService],
  exports: [TypeOrmModule],
})
export class DebtorModule {}
