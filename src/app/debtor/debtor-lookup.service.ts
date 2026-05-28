import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/common/entities/user.entity';
import { UserType } from '../user/common/enums/user-type.enum';
import { GetDebtorsDto } from './dto/get-debtors.dto';
import { Debtor } from './entities/debtor.entity';
import { DebtorStatus } from './enums/debtor-status.enum';

@Injectable()
export class DebtorLookupService {
  constructor(
    @InjectRepository(Debtor)
    private readonly debtorRepository: Repository<Debtor>,
  ) {}

  async countDebtors(query: GetDebtorsDto, user: User): Promise<number> {
    const queryBuilder = this.debtorRepository.createQueryBuilder('debtor');

    if (user.type === UserType.ADMIN) {
      // queryBuilder.leftJoinAndSelect('debtor.documents', 'documents');
      queryBuilder.leftJoinAndSelect('debtor.investor', 'investor');

      if (query.status) {
        queryBuilder.andWhere('(debtor.status = :status)', {
          status: query.status,
        });
      }

      if (query.includeDeleted && query.includeDeleted > 0) {
        queryBuilder.withDeleted();
      }
    } else {
      queryBuilder.leftJoinAndSelect('debtor.investor', 'investor');

      queryBuilder.andWhere(
        '(debtor.investorId = :userId OR debtor.status = :verifiedStatus)',
        {
          userId: user.id,
          verifiedStatus: DebtorStatus.VERIFIED,
        },
      );

      if (query.includeDeleted && query.includeDeleted > 0) {
        queryBuilder.withDeleted();
        queryBuilder.andWhere(
          '(debtor.investorId = :userId OR debtor.deletedAt IS NULL)',
          {
            userId: user.id,
          },
        );
      }
    }

    if (query.investorId) {
      queryBuilder.andWhere('(debtor.investorId = :investorId)', {
        investorId: query.investorId,
      });
    }

    if (query.email) {
      queryBuilder.andWhere('(debtor.email ILIKE :email)', {
        email: `%${query.email}%`,
      });
    }

    if (query.phoneNumber) {
      queryBuilder.andWhere('(debtor.phoneNumber ILIKE :phoneNumber)', {
        phoneNumber: `%${query.phoneNumber}%`,
      });
    }

    if (query.companyName) {
      queryBuilder.andWhere('(debtor.companyName ILIKE :companyName)', {
        companyName: `%${query.companyName}%`,
      });
    }

    if (query.taxId) {
      queryBuilder.andWhere('(debtor.taxId ILIKE :taxId)', {
        taxId: `%${query.taxId}%`,
      });
    }

    if (query.status) {
      queryBuilder.andWhere('(debtor.status = :status)', {
        status: query.status,
      });
    }

    return await queryBuilder.getCount();
  }
}
