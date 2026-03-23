import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  computeDiscount,
  computeProfitability,
} from '../auction/auction-metrics.util';
import { Auction } from '../auction/entities/auction.entity';
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
    @InjectRepository(Auction)
    private readonly auctionRepository: Repository<Auction>,
  ) {}

  async create(createBidDto: CreateBidDto, user: User): Promise<Bid> {
    const auction = await this.auctionRepository.findOne({
      where: { id: createBidDto.auctionId },
      relations: { invoice: true },
    });

    if (!auction) {
      throw new BadRequestException(
        `Auction with id ${createBidDto.auctionId} not found`,
      );
    }

    if (auction.status !== AuctionStatus.LIVE) {
      throw new BadRequestException('Bids can only be placed on live auctions');
    }

    const latestBid = await this.bidRepository
      .createQueryBuilder('bid')
      .innerJoin('bid.auction', 'auction')
      .where('auction.id = :auctionId', { auctionId: createBidDto.auctionId })
      .orderBy('bid.createdAt', 'DESC')
      .getOne();

    const latestBidAmount = latestBid
      ? latestBid.amount
      : auction.startingPrice;

    if (createBidDto.amount <= latestBidAmount) {
      throw new BadRequestException(
        `Bid amount must be greater than the current highest bid of ${latestBidAmount}`,
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
      .addSelect('bid.createdAt')
      .leftJoinAndSelect('bid.investor', 'investor')
      .where('bid.id = :id', { id: saved.id })
      .getOne() as Promise<Bid>;
  }

  async findAll(query: GetBidsDto, user: User) {
    const queryBuilder = this.bidRepository.createQueryBuilder('bid');

    queryBuilder
      .addSelect('bid.createdAt')
      .leftJoinAndSelect('bid.auction', 'auction')
      .leftJoinAndSelect('bid.investor', 'investor')
      .orderBy('bid.createdAt', 'DESC');

    if (user.type !== UserType.ADMIN) {
      queryBuilder.andWhere('auction.status IN (:...status)', {
        status: [AuctionStatus.LIVE, AuctionStatus.PAUSED],
      });
    }

    if (query.auctionId) {
      queryBuilder.andWhere('auction.id = :auctionId', {
        auctionId: query.auctionId,
      });
    }

    if (query.investorId) {
      queryBuilder.andWhere('investor.id = :investorId', {
        investorId: query.investorId,
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

  findOne(id: string) {
    return `This action returns a #${id} bid`;
  }
}
