import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DocumentType } from 'src/app/document/enums/document-type.enum';
import { Investor } from 'src/app/user/investor/entities/investor.entity';
import { InvestorStatus } from 'src/app/user/investor/enums/investor-status.enum';
import { Repository } from 'typeorm';
import { User } from '../common/entities/user.entity';
import { UserType } from '../common/enums/user-type.enum';
import { GetInvestorsDto } from './dto/get-investors.dto';

@Injectable()
export class InvestorLookupService {
  constructor(
    @InjectRepository(Investor)
    private investorRepository: Repository<Investor>,
  ) {}

  async countUsers(query: GetInvestorsDto, user: User): Promise<number> {
    const queryBuilder = this.investorRepository.createQueryBuilder('investor');

    if (user.type === UserType.ADMIN) {
      queryBuilder.leftJoinAndSelect('investor.documents', 'document');
      queryBuilder.leftJoinAndSelect('investor.bankAccount', 'bankAccount');
      queryBuilder.andWhere('document.type = :documentType', {
        documentType: DocumentType.IDENTIFICATION,
      });

      if (query.status) {
        queryBuilder.andWhere('investor.status = :status', {
          status: query.status,
        });
      }

      if (query.includeDeleted && query.includeDeleted > 0) {
        queryBuilder.withDeleted();
      }
    } else {
      queryBuilder.leftJoin('investor.documents', 'document');
      queryBuilder.select([
        'investor.id',
        'investor.email',
        'investor.name',
        'investor.phoneNumber',
        'investor.companyName',
        'investor.investorType',
      ]);
      queryBuilder.andWhere('investor.status = :status', {
        status: InvestorStatus.VERIFIED,
      });
    }

    if (query.email) {
      queryBuilder.andWhere('investor.email ILIKE :email', {
        email: `%${query.email}%`,
      });
    }

    if (query.name) {
      queryBuilder.andWhere('investor.name ILIKE :name', {
        name: `%${query.name}%`,
      });
    }

    if (query.companyName) {
      queryBuilder.andWhere('investor.companyName ILIKE :companyName', {
        companyName: `%${query.companyName}%`,
      });
    }

    if (query.phoneNumber) {
      queryBuilder.andWhere('investor.phoneNumber = :phoneNumber', {
        phoneNumber: query.phoneNumber,
      });
    }

    if (query.taxId) {
      queryBuilder.andWhere('document.value = :documentValue', {
        documentValue: query.taxId,
      });
    }

    if (query.investorType) {
      queryBuilder.andWhere('investor.investorType = :investorType', {
        investorType: query.investorType,
      });
    }

    return await queryBuilder.getCount();
  }
}
