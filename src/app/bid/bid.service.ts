import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  computeDiscount,
  computeProfitability,
} from '../auction/auction-metrics.util';
import { AuctionService } from '../auction/auction.service';
import { AuctionStatus } from '../auction/enums/auction-status.enum';
import { User } from '../user/common/entities/user.entity';
import { UserType } from '../user/common/enums/user-type.enum';
import { Investor } from '../user/investor/entities/investor.entity';
import { CreateBidDto } from './dto/create-bid.dto';
import { GetBidsDto } from './dto/get-bids.dto';
import { Bid } from './entities/bid.entity';

@Injectable()
export class BidService {
  constructor(
    @InjectRepository(Bid)
    private readonly bidRepository: Repository<Bid>,
    @Inject(forwardRef(() => AuctionService))
    private readonly auctionService: AuctionService,
  ) {}

  async create(createBidDto: CreateBidDto, user: User): Promise<Bid> {
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
      .where('auction.id = :auctionId', { auctionId: createBidDto.auctionId })
      .orderBy('bid.createdAt', 'DESC')
      .getOne();

    const latestBidAmount = latestBid ? latestBid.amount : auction.price.start;

    if (
      createBidDto.amount <=
      latestBidAmount *
        (1 + Number(process.env.SMALLEST_BID_INCREMENT_PERCENTAGE) / 100)
    ) {
      throw new BadRequestException(
        `Bid amount must be at least ${Number(process.env.SMALLEST_BID_INCREMENT_PERCENTAGE)}% greater than the current highest bid of ${latestBidAmount}`,
      );
    }

    const bid = this.bidRepository.create({
      auction,
      investor: user as Investor,
      amount: createBidDto.amount,
      discount: computeDiscount(auction.invoice.amount, createBidDto.amount),
      profitability: computeProfitability(
        auction.invoice.amount,
        auction.invoice.transactionFee.buyerPercentage,
        createBidDto.amount,
      ),
    });

    const saved = await this.bidRepository.save(bid);

    return this.bidRepository
      .createQueryBuilder('bid')
      .leftJoinAndSelect('bid.investor', 'investor')
      .where('bid.id = :id', { id: saved.id })
      .getOne() as Promise<Bid>;
  }

  async findAll(query: GetBidsDto, user: User) {
    const queryBuilder = this.bidRepository.createQueryBuilder('bid');

    queryBuilder
      .leftJoin('bid.auction', 'auction')
      .orderBy('bid.createdAt', 'DESC');

    if (user.type === UserType.ADMIN) {
      if (!query.auctionId && !query.investorId) {
        throw new BadRequestException([
          'At least one of auctionId or investorId query parameters is required',
        ]);
      }

      queryBuilder.leftJoinAndSelect('bid.investor', 'investor');

      if (query.investorId) {
        queryBuilder.andWhere('investor.id = :investorId', {
          investorId: query.investorId,
        });
      }
    } else {
      if (!query.auctionId) {
        throw new BadRequestException([
          'auctionId query parameter is required',
        ]);
      }

      queryBuilder.andWhere('auction.status IN (:...status)', {
        status: [AuctionStatus.PUBLISHED],
      });
    }

    if (query.auctionId) {
      await this.auctionService.findOne(query.auctionId, user);

      queryBuilder.andWhere('auction.id = :auctionId', {
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
      .leftJoinAndSelect('bid.investor', 'investor')
      .where('bid.id = :id', { id });

    if (user.type !== UserType.ADMIN) {
      queryBuilder.andWhere(
        'auction.status IN (:...status) OR bid.investor.id = :userId',
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
