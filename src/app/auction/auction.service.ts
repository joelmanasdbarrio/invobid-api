import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { BankAccountService } from '../bank-account/bank-account.service';
import { BidService } from '../bid/bid.service';
import { Invoice } from '../invoice/entities/invoice.entity';
import { InvoiceStatus } from '../invoice/enums/invoice-status.enum';
import { InvoiceService } from '../invoice/invoice.service';
import { User } from '../user/common/entities/user.entity';
import { UserType } from '../user/common/enums/user-type.enum';
import { Investor } from '../user/investor/entities/investor.entity';
import { InvestorService } from '../user/investor/investor.service';
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
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @Inject(forwardRef(() => BidService))
    private readonly bidService: BidService,
    private readonly invoiceService: InvoiceService,
    private readonly investorService: InvestorService,
    private readonly bankAccountService: BankAccountService,
  ) {}

  async create(createAuctionDto: CreateAuctionDto, user: Investor) {
    const invoice = await this.invoiceService.findOne(
      createAuctionDto.svc,
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
      .leftJoinAndSelect('invoice.sellerInvestor', 'sellerInvestor')
      .leftJoinAndSelect('invoice.buyerInvestor', 'buyerInvestor')
      .leftJoinAndSelect('invoice.debtor', 'debtor');

    if (user.type !== UserType.ADMIN) {
      queryBuilder.andWhere(
        '((sellerInvestor.id = :investorId AND buyerInvestor.id IS NULL) OR buyerInvestor.id = :investorId OR auction.status IN (:...publicStatuses))',
        {
          investorId:
            query.includeSelf && query.includeSelf > 0 ? user.id : null,
          publicStatuses: [AuctionStatus.PUBLISHED],
        },
      );

      if (query.hasBidded && query.hasBidded > 0) {
        queryBuilder.andWhere((qb) => {
          const subQuery = qb
            .subQuery()
            .select('bids.auctionId')
            .from('bids', 'bids')
            .where('bids.investorId = :investorId', { investorId: user.id })
            .getQuery();
          return 'auction.id IN ' + subQuery;
        });
      }

      if (!query.includeSelf || !(query.includeSelf > 0)) {
        queryBuilder.andWhere('(sellerInvestor.id != :investorId)', {
          investorId: user.id,
        });
      }
    }

    if (query.includeDeleted && query.includeDeleted > 0) {
      queryBuilder.withDeleted();
      queryBuilder.andWhere(
        '(sellerInvestor.id = :investorId OR debtor.deletedAt IS NULL)',
        {
          investorId: user.id,
        },
      );
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
      queryBuilder.andWhere(
        `(COALESCE((SELECT b.amount FROM bids b WHERE b."auctionId" = auction.id ORDER BY b."createdAt" DESC LIMIT 1), auction."priceStart") <= :maxAmount)`,
        { maxAmount: query.maxAmount },
      );
    }

    if (query.minAmount) {
      queryBuilder.andWhere(
        `(COALESCE((SELECT b.amount FROM bids b WHERE b."auctionId" = auction.id ORDER BY b."createdAt" DESC LIMIT 1), auction."priceStart") >= :minAmount)`,
        { minAmount: query.minAmount },
      );
    }

    if (query.minDiscount) {
      queryBuilder.andWhere(
        `(COALESCE((SELECT b.discount FROM bids b WHERE b."auctionId" = auction.id ORDER BY b."createdAt" DESC LIMIT 1), auction."discountStart") >= :minDiscount)`,
        { minDiscount: query.minDiscount },
      );
    }

    if (query.minProfitability) {
      queryBuilder.andWhere(
        `(COALESCE((SELECT b.profitability FROM bids b WHERE b."auctionId" = auction.id ORDER BY b."createdAt" DESC LIMIT 1), auction."profitabilityStart") >= :minProfitability)`,
        { minProfitability: query.minProfitability },
      );
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

    if (query.minRating) {
      queryBuilder.andWhere(
        '(invoice.rating >= :minRating OR invoice.extRating >= :minRating)',
        {
          minRating: query.minRating,
        },
      );
    }

    if (query.status) {
      queryBuilder.andWhere('(auction.status = :status)', {
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
        '((sellerInvestor.id = :userId AND buyerInvestor.id IS NULL) OR buyerInvestor.id = :userId OR auction.status IN (:...publicStatuses))',
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
      auction.status === AuctionStatus.CANCELLED ||
      auction.status === AuctionStatus.PUBLISHED
    ) {
      throw new ForbiddenException(
        `Auction with id ${id} can no longer be updated`,
      );
    }

    if (updateAuctionDto.status === AuctionStatus.TRANSITIONING) {
      throw new ForbiddenException(
        `Auction status cannot be set to ${AuctionStatus.TRANSITIONING} manually`,
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
            `A ${AuctionStatus.TRANSITIONING} auction can only be set to ${AuctionStatus.FINISHED} or ${AuctionStatus.CANCELLED}`,
          );
        }

        if (updateAuctionDto.status === AuctionStatus.CANCELLED) {
          await this.cancelAuction(updateAuctionDto, auction, user);
        }

        if (updateAuctionDto.status === AuctionStatus.FINISHED) {
          await this.finishAuction(auction, user);
        }
      }
    } else {
      if (
        auction.invoice.sellerInvestor.id !== user.id ||
        auction.status !== AuctionStatus.DRAFT
      ) {
        throw new ForbiddenException(
          `You do not have permission to perform this action`,
        );
      }

      if (updateAuctionDto.status === AuctionStatus.PUBLISHED) {
        this.publishAuction(auction, updateAuctionDto);
      }

      updateAuctionDto.lastCommunication = auction.lastCommunication;
    }

    Object.assign(auction, updateAuctionDto.removeUndefined());
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

  async extendAuctionIfNeeded(auctionId: string): Promise<string | null> {
    const auction = await this.auctionRepository.findOne({
      where: { id: auctionId },
    });

    if (!auction) return null;

    const extensionMs =
      Number(process.env.AUCTION_EXTENSION_MINUTES) * 60 * 1000;
    if (auction.date.end.getTime() - Date.now() <= extensionMs) {
      const newEndTime = new Date(Date.now() + extensionMs);
      auction.date.end = newEndTime;
      await this.auctionRepository.save(auction);
      return newEndTime.toISOString();
    }

    return null;
  }

  async transitionToTransitioning(auctionId: string): Promise<void> {
    const auction = await this.auctionRepository.findOne({
      where: { id: auctionId },
    });

    if (!auction) return;

    auction.status = AuctionStatus.TRANSITIONING;
    await this.auctionRepository.save(auction);
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

  private publishAuction(auction: Auction, updateAuctionDto: UpdateAuctionDto) {
    auction.date.start = new Date();

    if (updateAuctionDto.auctionDateEnd === undefined) {
      throw new BadRequestException(
        `auctionDateEnd is required when publishing an auction`,
      );
    }

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

  private async cancelAuction(
    updateAuctionDto: UpdateAuctionDto,
    auction: Auction,
    user: User,
  ) {
    if (!updateAuctionDto.lastCommunication) {
      throw new BadRequestException(
        `lastCommunication is required when cancelling an auction`,
      );
    }

    const latestBid = await this.bidService
      .findAll({ auctionId: auction.id, page: 1, limit: 1 }, user)
      .then((res) => res.data[0]);

    if (latestBid) {
      const investor = await this.investorService.findOne(
        latestBid.investor.id,
        user,
      );
      if (investor?.bankAccount) {
        await this.bankAccountService.releaseBalance(
          investor.bankAccount.id,
          parseFloat(latestBid.amount.toString()),
        );
      }
    }
  }

  private async finishAuction(auction: Auction, user: User) {
    const latestBid = await this.bidService
      .findAll({ auctionId: auction.id, page: 1, limit: 1 }, user)
      .then((res) => res.data[0]);

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

    const buyerInvestor = await this.investorService.findOne(
      latestBid.investor.id,
      user,
    );

    if (!buyerInvestor) {
      throw new NotFoundException(
        `Buyer investor with id ${latestBid.investor.id} not found`,
      );
    }

    if (!buyerInvestor.bankAccount) {
      throw new BadRequestException(
        `Buyer investor does not have a bank account`,
      );
    }

    const sellerInvestor = await this.investorService.findOne(
      auction.invoice.sellerInvestor.id,
      user,
    );

    if (!sellerInvestor) {
      throw new NotFoundException(
        `Seller investor with id ${auction.invoice.sellerInvestor.id} not found`,
      );
    }

    if (!sellerInvestor.bankAccount) {
      throw new BadRequestException(
        `Seller investor does not have a bank account`,
      );
    }

    const platformAccount = await this.bankAccountService.getPlatformAccount();

    const totalReserved = parseFloat(latestBid.amount.toString());
    const buyerFeePercentage = auction.invoice.transactionFee.buyerPercentage;
    const bidAmount = totalReserved / (1 + buyerFeePercentage / 100);
    const buyerFee = totalReserved - bidAmount;
    const sellerFee =
      (bidAmount * auction.invoice.transactionFee.sellerPercentage) / 100;

    auction.invoice.buyerInvestor = buyerInvestor;
    await this.invoiceRepository.save({
      id: auction.invoice.id,
      buyerInvestor,
    });

    await this.bankAccountService.settleAuction({
      buyerAccountId: buyerInvestor.bankAccount.id,
      sellerAccountId: sellerInvestor.bankAccount.id,
      platformAccountId: platformAccount.id,
      bidAmount,
      buyerFee,
      sellerFee,
    });
  }
}
