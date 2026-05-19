import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  computeDiscount,
  computeProfitability,
} from '../auction/auction-metrics.util';
import { AuctionService } from '../auction/auction.service';
import { AuctionStatus } from '../auction/enums/auction-status.enum';
import { BankAccountService } from '../bank-account/bank-account.service';
import { User } from '../user/common/entities/user.entity';
import { UserType } from '../user/common/enums/user-type.enum';
import { Investor } from '../user/investor/entities/investor.entity';
import { CreateBidDto } from './dto/create-bid.dto';
import { GetBidsDto } from './dto/get-bids.dto';
import { Bid } from './entities/bid.entity';

export interface BidBalanceUpdate {
  investorId: string;
  reservedBalance: number;
}

export interface CreateBidResult {
  bid: Bid;
  balanceUpdates: BidBalanceUpdate[];
}

@Injectable()
export class BidService {
  constructor(
    @InjectRepository(Bid)
    private readonly bidRepository: Repository<Bid>,
    @Inject(forwardRef(() => AuctionService))
    private readonly auctionService: AuctionService,
    private readonly bankAccountService: BankAccountService,
    private readonly dataSource: DataSource,
  ) {}

  async create(
    createBidDto: CreateBidDto,
    user: Investor,
  ): Promise<CreateBidResult> {
    const auction = await this.auctionService.findOne(
      createBidDto.auctionId,
      user,
    );

    if (!auction) {
      throw new BadRequestException(
        `Auction with id ${createBidDto.auctionId} not found`,
      );
    }

    if (auction.invoice.sellerInvestor.id === user.id) {
      throw new BadRequestException(
        'Sellers cannot place bids on their own auctions',
      );
    }

    if (auction.status !== AuctionStatus.PUBLISHED) {
      throw new BadRequestException(
        'Bids can only be placed on published auctions',
      );
    }

    const latestBid = await this.bidRepository
      .createQueryBuilder('bid')
      .innerJoin('bid.auction', 'auction')
      .leftJoinAndSelect('bid.investor', 'investor')
      .leftJoinAndSelect('investor.bankAccount', 'bankAccount')
      .where('auction.id = :auctionId', { auctionId: createBidDto.auctionId })
      .orderBy('bid.createdAt', 'DESC')
      .getOne();

    if (latestBid && latestBid.investor.id === user.id) {
      throw new BadRequestException(
        'You already have the highest bid on this auction',
      );
    }

    const latestBidAmount = latestBid ? latestBid.amount : auction.price.start;

    const buyerFee =
      (createBidDto.amount * auction.invoice.transactionFee.buyerPercentage) /
      100;
    const newBidAmount = createBidDto.amount + buyerFee;

    if (
      newBidAmount <
      latestBidAmount *
        (1 + Number(process.env.SMALLEST_BID_INCREMENT_PERCENTAGE) / 100)
    ) {
      throw new BadRequestException(
        `Bid amount must be at least ${Number(process.env.SMALLEST_BID_INCREMENT_PERCENTAGE)}% greater than the current highest bid of ${latestBidAmount}`,
      );
    }

    return await this.dataSource.transaction(async (manager) => {
      const balanceUpdates: BidBalanceUpdate[] = [];

      if (latestBid) {
        const prevBankAccountId = latestBid.investor?.bankAccount?.id;
        if (prevBankAccountId) {
          const released = await this.bankAccountService.releaseBalance(
            prevBankAccountId,
            latestBid.amount,
            manager,
          );
          balanceUpdates.push({
            investorId: latestBid.investor.id,
            reservedBalance: Number(released.reservedBalance),
          });
        }
      }

      const reserved = await this.bankAccountService.reserveBalance(
        user.bankAccount.id,
        newBidAmount,
        manager,
      );
      balanceUpdates.push({
        investorId: user.id,
        reservedBalance: Number(reserved.reservedBalance),
      });

      const bid = manager.create(Bid, {
        auction,
        investor: user,
        amount: newBidAmount,
        discount: computeDiscount(auction.invoice.amount, newBidAmount),
        profitability: computeProfitability(
          auction.invoice.amount,
          auction.invoice.transactionFee.buyerPercentage,
          newBidAmount,
        ),
      });

      const savedBid = await manager.save(bid);
      return { bid: savedBid, balanceUpdates };
    });
  }

  async findAll(query: GetBidsDto, user: User) {
    const queryBuilder = this.bidRepository.createQueryBuilder('bid');

    queryBuilder
      .leftJoinAndSelect('bid.auction', 'auction')
      .leftJoinAndSelect('auction.invoice', 'invoice')
      .orderBy('bid.createdAt', 'DESC');

    if (!query.auctionId && !query.investorId) {
      throw new BadRequestException([
        'At least one of auctionId or investorId query parameters is required',
      ]);
    }

    if (user.type === UserType.ADMIN) {
      queryBuilder.leftJoinAndSelect('bid.investor', 'investor');
    } else {
      queryBuilder.leftJoinAndSelect(
        'bid.investor',
        'investor',
        'investor.id = :userId',
        { userId: user.id },
      );

      queryBuilder.andWhere('(auction.status IN (:...status))', {
        status: [AuctionStatus.PUBLISHED],
      });
    }

    if (query.investorId) {
      queryBuilder.andWhere('(investor.id = :investorId)', {
        investorId: query.investorId,
      });
    }

    if (query.auctionId) {
      await this.auctionService.findOne(query.auctionId, user);

      queryBuilder.andWhere('(auction.id = :auctionId)', {
        auctionId: query.auctionId,
      });
    }

    const total = await queryBuilder.getCount();

    if (query.page && query.limit) {
      const skip = (query.page - 1) * query.limit;
      queryBuilder.skip(skip).take(query.limit);
    }

    const data = await queryBuilder.getMany();

    return {
      data,
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  async findOne(id: string, user: User) {
    const queryBuilder = this.bidRepository.createQueryBuilder('bid');

    queryBuilder
      .leftJoinAndSelect('bid.auction', 'auction')
      .leftJoinAndSelect('auction.invoice', 'invoice')
      .leftJoinAndSelect('bid.investor', 'investor', 'investor.id = :userId', {
        userId: user.id,
      })
      .where('bid.id = :id', { id });

    if (user.type !== UserType.ADMIN) {
      queryBuilder.andWhere(
        '(auction.status IN (:...status) OR bid.investor.id = :userId)',
        {
          status: [AuctionStatus.PUBLISHED],
          userId: user.id,
        },
      );
    }

    const bid = await queryBuilder.getOne();

    if (!bid) {
      throw new NotFoundException(`Bid with id ${id} not found`);
    }

    return bid;
  }
}
