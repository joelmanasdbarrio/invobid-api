import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DebtorStatus } from '../debtor/enums/debtor-status.enum';
import { User } from '../user/common/entities/user.entity';
import { UserType } from '../user/common/enums/user-type.enum';
import { GetInvoicesDto } from './dto/get-invoices.dto';
import { Invoice } from './entities/invoice.entity';
import { InvoiceStatus } from './enums/invoice-status.enum';

@Injectable()
export class InvoiceLookupService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
  ) {}

  async countInvoices(query: GetInvoicesDto, user: User): Promise<number> {
    const queryBuilder = this.invoiceRepository.createQueryBuilder('invoice');

    queryBuilder.leftJoinAndSelect('invoice.buyerInvestor', 'buyerInvestor');
    queryBuilder.leftJoinAndSelect('invoice.auctions', 'auctions');
    queryBuilder.leftJoinAndSelect('invoice.debtor', 'debtor');
    queryBuilder.leftJoinAndSelect('invoice.sellerInvestor', 'sellerInvestor');
    queryBuilder.leftJoinAndSelect('invoice.documents', 'documents');

    if (user.type === UserType.ADMIN) {
      if (query.includeDeleted && query.includeDeleted > 0) {
        queryBuilder.withDeleted();
      }
    } else {
      queryBuilder.andWhere(
        '(invoice.sellerInvestorId = :investorId OR (invoice.status = :verifiedStatusInvoice AND debtor.status = :verifiedStatusDebtor))',
        {
          investorId: user.id,
          verifiedStatusInvoice: InvoiceStatus.VERIFIED,
          verifiedStatusDebtor: DebtorStatus.VERIFIED,
        },
      );

      if (query.includeDeleted && query.includeDeleted > 0) {
        queryBuilder.withDeleted();
        queryBuilder.andWhere(
          '(invoice.sellerInvestorId = :userId OR debtor.deletedAt IS NULL)',
          {
            userId: user.id,
          },
        );
      }
    }

    if (query.sellerInvestorId) {
      queryBuilder.andWhere('(invoice.sellerInvestorId = :sellerInvestorId)', {
        sellerInvestorId: query.sellerInvestorId,
      });
    }

    if (query.sellerCompanyName) {
      queryBuilder.andWhere(
        '(sellerInvestor.companyName ILIKE :sellerCompanyName)',
        {
          sellerCompanyName: `%${query.sellerCompanyName}%`,
        },
      );
    }

    if (query.buyerInvestorId) {
      queryBuilder.andWhere('(invoice.buyerInvestorId = :buyerInvestorId)', {
        buyerInvestorId: query.buyerInvestorId,
      });
    }

    if (query.buyerCompanyName) {
      queryBuilder.andWhere(
        '(buyerInvestor.companyName ILIKE :buyerCompanyName)',
        {
          buyerCompanyName: `%${query.buyerCompanyName}%`,
        },
      );
    }

    if (query.debtorId) {
      queryBuilder.andWhere('(invoice.debtorId = :debtorId)', {
        debtorId: query.debtorId,
      });
    }

    if (query.debtorCompanyName) {
      queryBuilder.andWhere('(debtor.companyName ILIKE :debtorCompanyName)', {
        debtorCompanyName: `%${query.debtorCompanyName}%`,
      });
    }

    if (query.minAmount) {
      queryBuilder.andWhere('(invoice.amount >= :minAmount)', {
        minAmount: query.minAmount,
      });
    }

    if (query.maxAmount) {
      queryBuilder.andWhere('(invoice.amount <= :maxAmount)', {
        maxAmount: query.maxAmount,
      });
    }

    if (query.minRating) {
      queryBuilder.andWhere('(debtor.rating >= :minRating)', {
        minRating: query.minRating,
      });
    }

    if (query.status) {
      queryBuilder.andWhere('(invoice.status = :status)', {
        status: query.status,
      });
    }

    if (query.dueDateFrom) {
      queryBuilder.andWhere('(invoice.dueDate >= :dueDateFrom)', {
        dueDateFrom: query.dueDateFrom,
      });
    }

    if (query.dueDateTo) {
      queryBuilder.andWhere('(invoice.dueDate <= :dueDateTo)', {
        dueDateTo: query.dueDateTo,
      });
    }

    if (query.isSold !== undefined) {
      if (query.isSold > 0) {
        queryBuilder.andWhere('(invoice.buyerInvestorId IS NOT NULL)');
      } else {
        queryBuilder.andWhere('(invoice.buyerInvestorId IS NULL)');
      }
    }

    return await queryBuilder.getCount();
  }
}
