import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/common/entities/user.entity';
import { UserType } from '../user/common/enums/user-type.enum';
import { GetAuctionsDto } from './dto/get-auctions.dto';
import { Auction } from './entities/auction.entity';
import { AuctionStatus } from './enums/auction-status.enum';

@Injectable()
export class AuctionLookupService {
  constructor(
    @InjectRepository(Auction)
    private readonly auctionRepository: Repository<Auction>,
  ) {}

  async countAuctions(query: GetAuctionsDto, user: User): Promise<number> {
    const queryBuilder = this.auctionRepository.createQueryBuilder('auction');

    queryBuilder
      .leftJoinAndSelect('auction.invoice', 'invoice')
      .leftJoinAndSelect('auction.bids', 'bids')
      .leftJoinAndSelect('invoice.sellerInvestor', 'sellerInvestor')
      .leftJoinAndSelect('invoice.buyerInvestor', 'buyerInvestor')
      .leftJoinAndSelect('invoice.debtor', 'debtor');

    if (user.type === UserType.ADMIN) {
      if (query.includeDeleted && query.includeDeleted > 0) {
        queryBuilder.withDeleted();
      }
    } else {
      queryBuilder.andWhere(
        '(sellerInvestor.id = :userId OR auction.status IN (:...publicStatuses))',
        {
          userId: user.id,
          publicStatuses: [AuctionStatus.PUBLISHED],
        },
      );
      if (query.includeDeleted && query.includeDeleted > 0) {
        queryBuilder.withDeleted();
      }
    }

    if (query.invoiceSvc) {
      queryBuilder.andWhere('(invoice.svc = :invoiceSvc)', {
        invoiceSvc: query.invoiceSvc,
      });
    }

    if (query.sellerInvestorId) {
      queryBuilder.andWhere('(sellerInvestor.id = :sellerInvestorId)', {
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
      queryBuilder.andWhere('(buyerInvestor.id = :buyerInvestorId)', {
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
      queryBuilder.andWhere('(debtor.id = :debtorId)', {
        debtorId: query.debtorId,
      });
    }

    if (query.debtorCompanyName) {
      queryBuilder.andWhere('(debtor.companyName ILIKE :debtorCompanyName)', {
        debtorCompanyName: `%${query.debtorCompanyName}%`,
      });
    }

    if (query.maxAmount) {
      queryBuilder.andWhere('(invoice.amount <= :maxAmount)', {
        maxAmount: query.maxAmount,
      });
    }

    if (query.minAmount) {
      queryBuilder.andWhere('(invoice.amount >= :minAmount)', {
        minAmount: query.minAmount,
      });
    }

    if (query.auctionDateStart) {
      queryBuilder.andWhere('(auction.date.start >= :auctionDateStart)', {
        auctionDateStart: query.auctionDateStart,
      });
    }

    if (query.auctionDateEnd) {
      queryBuilder.andWhere('(auction.date.end <= :auctionDateEnd)', {
        auctionDateEnd: query.auctionDateEnd,
      });
    }

    if (query.status) {
      queryBuilder.andWhere('(auction.status = :status)', {
        status: query.status,
      });
    }

    return await queryBuilder.getCount();
  }
}
