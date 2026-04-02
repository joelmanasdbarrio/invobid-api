import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { Bid } from '../bid/entities/bid.entity';
import { InvoiceStatus } from '../invoice/enums/invoice-status.enum';
import { InvoiceService } from '../invoice/invoice.service';
import { User } from '../user/common/entities/user.entity';
import { UserType } from '../user/common/enums/user-type.enum';
import { Investor } from '../user/investor/entities/investor.entity';
import { computeDiscount, computeProfitability } from './auction-metrics.util';
import { CreateAuctionDto } from './dto/create-auction.dto';
import { GetAuctionsDto } from './dto/get-auctions.dto';
import { UpdateAuctionDto } from './dto/update-auction.dto';
import { Auction } from './entities/auction.entity';
import { AuctionStatus } from './enums/auction-status.enum';

const toUTCDate = (val: string | Date): Date => {
  const str = val instanceof Date ? val.toISOString().slice(0, 10) : val;
  return new Date(str + 'T00:00:00Z');
};

@Injectable()
export class AuctionService {
  constructor(
    @InjectRepository(Auction)
    private readonly auctionRepository: Repository<Auction>,
    @InjectRepository(Bid)
    private readonly bidRepository: Repository<Bid>,
    private readonly invoiceService: InvoiceService,
  ) {}

  async create(createAuctionDto: CreateAuctionDto, user: Investor) {
    const invoice = await this.invoiceService.findOne(
      createAuctionDto.invoiceUid,
      user,
    );

    if (
      invoice.status !== InvoiceStatus.VERIFIED ||
      invoice.sellerInvestor.id !== user.id
    ) {
      throw new BadRequestException(
        `Invoice with id ${invoice.id} is not verified and/or does not belong to the user`,
      );
    }

    const endDate = toUTCDate(createAuctionDto.auctionDateEnd);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const minEndDate = new Date(today);
    minEndDate.setUTCDate(minEndDate.getUTCDate() + 2);

    const dueDateUTC = toUTCDate(invoice.dueDate);
    const oneMonthBeforeDue = new Date(dueDateUTC);
    oneMonthBeforeDue.setUTCMonth(oneMonthBeforeDue.getUTCMonth() - 1);

    if (endDate < minEndDate || endDate > oneMonthBeforeDue) {
      throw new BadRequestException(`Auction dates are not valid`);
    }

    const activeAuctions = await this.auctionRepository.count({
      where: {
        invoice: { id: invoice.id },
        status: Not(In([AuctionStatus.FINISHED, AuctionStatus.CANCELLED])),
      },
    });

    if (activeAuctions > 0) {
      throw new BadRequestException(
        `There is already an active auction for this invoice`,
      );
    }

    let auction: Auction | undefined;
    try {
      const metrics = this.computeMetrics(
        invoice.amount,
        invoice.transactionFee.buyerPercentage,
        createAuctionDto.startingPrice,
      );
      auction = this.auctionRepository.create({
        invoice,
        price: { start: createAuctionDto.startingPrice },
        discount: { start: metrics.discount },
        profitability: { start: metrics.profitability },
        date: {
          end: createAuctionDto.auctionDateEnd,
        },
      });

      return await this.auctionRepository.save(auction);
    } catch (error) {
      console.error(error);
      if (auction) {
        await this.auctionRepository.delete(auction.id);
      }

      throw new InternalServerErrorException(error);
    }
  }

  async findAll(query: GetAuctionsDto, user: User) {
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
          userId: query.includeSelf && query.includeSelf > 0 ? user.id : null,
          publicStatuses: [AuctionStatus.PUBLISHED],
        },
      );
      if (query.includeDeleted && query.includeDeleted > 0) {
        queryBuilder.withDeleted();
      }
    }

    if (query.invoiceUid) {
      queryBuilder.andWhere('auction.invoiceUid = :invoiceUid', {
        invoiceUid: query.invoiceUid,
      });
    }

    if (query.sellerInvestorId) {
      queryBuilder.andWhere('sellerInvestor.id = :sellerInvestorId', {
        sellerInvestorId: query.sellerInvestorId,
      });
    }

    if (query.sellerCompanyName) {
      queryBuilder.andWhere(
        'sellerInvestor.companyName ILIKE :sellerCompanyName',
        {
          sellerCompanyName: `%${query.sellerCompanyName}%`,
        },
      );
    }

    if (query.buyerInvestorId) {
      queryBuilder.andWhere('buyerInvestor.id = :buyerInvestorId', {
        buyerInvestorId: query.buyerInvestorId,
      });
    }

    if (query.buyerCompanyName) {
      queryBuilder.andWhere(
        'buyerInvestor.companyName ILIKE :buyerCompanyName',
        {
          buyerCompanyName: `%${query.buyerCompanyName}%`,
        },
      );
    }

    if (query.debtorId) {
      queryBuilder.andWhere('debtor.id = :debtorId', {
        debtorId: query.debtorId,
      });
    }

    if (query.debtorCompanyName) {
      queryBuilder.andWhere('debtor.companyName ILIKE :debtorCompanyName', {
        debtorCompanyName: `%${query.debtorCompanyName}%`,
      });
    }

    if (query.maxAmount) {
      queryBuilder.andWhere(
        `COALESCE((SELECT b.amount FROM bids b WHERE b."auctionId" = auction.id ORDER BY b."createdAt" DESC LIMIT 1), auction."priceStart") <= :maxAmount`,
        { maxAmount: query.maxAmount },
      );
    }

    if (query.minAmount) {
      queryBuilder.andWhere(
        `COALESCE((SELECT b.amount FROM bids b WHERE b."auctionId" = auction.id ORDER BY b."createdAt" DESC LIMIT 1), auction."priceStart") >= :minAmount`,
        { minAmount: query.minAmount },
      );
    }

    if (query.minDiscount) {
      queryBuilder.andWhere(
        `COALESCE((SELECT b.discount FROM bids b WHERE b."auctionId" = auction.id ORDER BY b."createdAt" DESC LIMIT 1), auction."discountStart") >= :minDiscount`,
        { minDiscount: query.minDiscount },
      );
    }

    if (query.minProfitability) {
      queryBuilder.andWhere(
        `COALESCE((SELECT b.profitability FROM bids b WHERE b."auctionId" = auction.id ORDER BY b."createdAt" DESC LIMIT 1), auction."profitabilityStart") >= :minProfitability`,
        { minProfitability: query.minProfitability },
      );
    }

    if (query.auctionDateStart) {
      queryBuilder.andWhere('auction.date.start >= :auctionDateStart', {
        auctionDateStart: query.auctionDateStart,
      });
    }

    if (query.auctionDateEnd) {
      queryBuilder.andWhere('auction.date.end <= :auctionDateEnd', {
        auctionDateEnd: query.auctionDateEnd,
      });
    }

    if (query.minRating) {
      queryBuilder.andWhere(
        'invoice.rating >= :minRating OR invoice.extRating >= :minRating',
        {
          minRating: query.minRating,
        },
      );
    }

    if (query.status) {
      queryBuilder.andWhere('auction.status = :status', {
        status: query.status,
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
    const queryBuilder = this.auctionRepository.createQueryBuilder('auction');

    queryBuilder
      .leftJoinAndSelect('auction.invoice', 'invoice')
      .leftJoinAndSelect('auction.bids', 'bids')
      .leftJoinAndSelect('invoice.sellerInvestor', 'sellerInvestor')
      .leftJoinAndSelect('invoice.buyerInvestor', 'buyerInvestor')
      .leftJoinAndSelect('invoice.debtor', 'debtor')
      .where('auction.id = :id', { id })
      .withDeleted();

    if (user.type === UserType.ADMIN) {
      queryBuilder.leftJoinAndSelect('bids.investor', 'investor');
    } else {
      queryBuilder.andWhere(
        '(sellerInvestor.id = :userId OR auction.status IN (:...publicStatuses))',
        {
          userId: user.id,
          publicStatuses: [AuctionStatus.PUBLISHED],
        },
      );
    }

    const auction = await queryBuilder.getOne();

    if (!auction) {
      throw new NotFoundException(`Auction with id ${id} not found`);
    }

    return auction;
  }

  async update(id: string, updateAuctionDto: UpdateAuctionDto, user: User) {
    const auction = await this.findOne(id, user);

    if (
      auction.status === AuctionStatus.FINISHED ||
      auction.status === AuctionStatus.CANCELLED
    ) {
      throw new BadRequestException(
        `Auction with id ${id} can no longer be updated`,
      );
    }

    if (auction.status === AuctionStatus.PUBLISHED) {
      throw new BadRequestException(
        `Auction with id ${id} is published and cannot be modified`,
      );
    }

    if (updateAuctionDto.status === AuctionStatus.TRANSITIONING) {
      throw new BadRequestException(
        `Auction status cannot be set to transitioning manually`,
      );
    }

    if (user.type === UserType.ADMIN) {
      if (updateAuctionDto.status !== undefined) {
        if (
          auction.status === AuctionStatus.TRANSITIONING &&
          updateAuctionDto.status !== AuctionStatus.FINISHED &&
          updateAuctionDto.status !== AuctionStatus.CANCELLED
        ) {
          throw new BadRequestException(
            `A transitioning auction can only be set to finished or cancelled`,
          );
        }

        // When transitioning to FINISHED, populate ending values from latest bid
        if (updateAuctionDto.status === AuctionStatus.FINISHED) {
          const latestBid = await this.bidRepository.findOne({
            where: { auction: { id } },
            order: { createdAt: 'DESC' },
          });

          if (latestBid) {
            auction.price.end = parseFloat(latestBid.amount.toString());
            auction.discount.end = parseFloat(latestBid.discount.toString());
            auction.profitability.end = parseFloat(
              latestBid.profitability.toString(),
            );
          } else {
            throw new BadRequestException(
              `Auction must have at least one bid before finishing`,
            );
          }
        }
      }

      if (
        updateAuctionDto.status === AuctionStatus.PUBLISHED &&
        auction.status === AuctionStatus.DRAFT
      ) {
        auction.date.start = new Date();
      }
    } else {
      if (auction.status === AuctionStatus.TRANSITIONING) {
        throw new ForbiddenException(
          `You do not have permission to perform this action`,
        );
      }

      if (auction.invoice.sellerInvestor.id !== user.id) {
        throw new ForbiddenException(
          `You do not have permission to perform this action`,
        );
      }

      if (updateAuctionDto.auctionDateEnd !== undefined) {
        const endDate = toUTCDate(updateAuctionDto.auctionDateEnd);
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        const minEndDate = new Date(today);
        minEndDate.setUTCDate(minEndDate.getUTCDate() + 2);

        const dueDateUTC = toUTCDate(auction.invoice.dueDate);
        const oneMonthBeforeDue = new Date(dueDateUTC);
        oneMonthBeforeDue.setUTCMonth(oneMonthBeforeDue.getUTCMonth() - 1);

        if (endDate < minEndDate || endDate > oneMonthBeforeDue) {
          throw new BadRequestException(`Auction dates are not valid`);
        }
      }

      if (
        updateAuctionDto.status !== undefined &&
        updateAuctionDto.status !== AuctionStatus.PUBLISHED
      ) {
        updateAuctionDto.status = auction.status;
      }

      if (updateAuctionDto.status === AuctionStatus.PUBLISHED) {
        auction.date.start = new Date();
      }

      updateAuctionDto.lastCommunication = auction.lastCommunication;
    }

    if (updateAuctionDto.status !== undefined)
      auction.status = updateAuctionDto.status;
    if (updateAuctionDto.lastCommunication !== undefined)
      auction.lastCommunication = updateAuctionDto.lastCommunication;
    if (updateAuctionDto.auctionDateEnd !== undefined)
      auction.date.end = new Date(updateAuctionDto.auctionDateEnd);
    if (updateAuctionDto.startingPrice !== undefined)
      auction.price.start = updateAuctionDto.startingPrice;
    const { discount, profitability } = this.computeMetrics(
      auction.invoice.amount,
      auction.invoice.transactionFee.buyerPercentage,
      auction.price.start,
    );
    auction.discount.start = discount;
    auction.profitability.start = profitability;
    return await this.auctionRepository.save(auction);
  }

  async remove(id: string, user: User, useSoft = true) {
    const auction = await this.findOne(id, user);

    if (
      auction.invoice.sellerInvestor.id !== user.id &&
      user.type !== UserType.ADMIN
    ) {
      throw new ForbiddenException(
        `You do not have permission to perform this action`,
      );
    }

    if (useSoft) {
      await this.auctionRepository.softDelete(auction.id);
    } else {
      await this.auctionRepository.delete(auction.id);
    }
  }

  private computeMetrics(
    invoiceAmount: number,
    buyerPercentage: number,
    startingPrice: number,
  ): { discount: number; profitability: number } {
    return {
      discount: computeDiscount(invoiceAmount, startingPrice),
      profitability: computeProfitability(
        invoiceAmount,
        buyerPercentage,
        startingPrice,
      ),
    };
  }
}
