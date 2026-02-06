import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Debtor } from './entities/debtor.entity';
import { DebtorStatus } from './enums/debtor-status.enum';

@Injectable()
export class DebtorLookupService {
  constructor(
    @InjectRepository(Debtor)
    private readonly debtorRepository: Repository<Debtor>,
  ) {}

  async countPendingDebtors(): Promise<number> {
    return await this.debtorRepository.count({
      where: { status: DebtorStatus.PENDING },
    });
  }

  async countCorrectionDebtors(investorId: string): Promise<number> {
    return await this.debtorRepository.count({
      where: { status: DebtorStatus.CORRECTION, investor: { id: investorId } },
    });
  }
}
