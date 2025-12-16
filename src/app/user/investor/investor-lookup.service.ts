import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Investor } from 'src/app/user/investor/entities/investor.entity';
import { Repository } from 'typeorm';
import { InvestorStatus } from 'src/app/user/investor/enums/investor-status.enum';

@Injectable()
export class InvestorLookupService {
  constructor(
    @InjectRepository(Investor)
    private investorRepository: Repository<Investor>,
  ) {}

  async countPendingUsers(): Promise<number> {
    return await this.investorRepository.count({
      where: { status: InvestorStatus.PENDING },
    });
  }
}
