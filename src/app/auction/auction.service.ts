import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { InvoiceStatus } from '../invoice/enums/invoice-status.enum';
import { InvoiceService } from '../invoice/invoice.service';
import { User } from '../user/common/entities/user.entity';
import { UserType } from '../user/common/enums/user-type.enum';
import { Investor } from '../user/investor/entities/investor.entity';
import { CreateAuctionDto } from './dto/create-auction.dto';
import { GetAuctionsDto } from './dto/get-auctions.dto';
import { UpdateAuctionDto } from './dto/update-auction.dto';
import { Auction } from './entities/auction.entity';
import { AuctionStatus } from './enum/auction-status.enum';

const toUTCDate = (val: string | Date): Date => {
  const str = val instanceof Date ? val.toISOString().slice(0, 10) : val;
  return new Date(str + 'T00:00:00Z');
};

@Injectable()
export class AuctionService {
  constructor(
    @InjectRepository(Auction)
    private readonly auctionRepository: Repository<Auction>,
    private readonly invoiceService: InvoiceService,
  ) {}

  async create(createAuctionDto: CreateAuctionDto, user: Investor) {
    const invoice = await this.invoiceService.findOne(
      createAuctionDto.invoiceId,
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

    const startDate = toUTCDate(createAuctionDto.auctionDateStart);
    const endDate = toUTCDate(createAuctionDto.auctionDateEnd);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    if (
      endDate <= startDate ||
      startDate <= today ||
      endDate >= toUTCDate(invoice.dueDate)
    ) {
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
      auction = this.auctionRepository.create({
        invoice,
        startingPrice: createAuctionDto.startingPrice,
        auctionDate: {
          auctionDateStart: createAuctionDto.auctionDateStart,
          auctionDateEnd: createAuctionDto.auctionDateEnd,
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
          userId: user.id,
          publicStatuses: [AuctionStatus.PUBLISHED, AuctionStatus.LIVE],
        },
      );
      if (query.includeDeleted && query.includeDeleted > 0) {
        queryBuilder.withDeleted();
      }
    }

    if (query.invoiceId) {
      queryBuilder.andWhere('auction.invoiceId = :invoiceId', {
        invoiceId: query.invoiceId,
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
      queryBuilder.andWhere('invoice.amount <= :maxAmount', {
        maxAmount: query.maxAmount,
      });
    }

    if (query.minAmount) {
      queryBuilder.andWhere('invoice.amount >= :minAmount', {
        minAmount: query.minAmount,
      });
    }

    if (query.auctionDateStart) {
      queryBuilder.andWhere('auction.auctionDateStart >= :auctionDateStart', {
        auctionDateStart: query.auctionDateStart,
      });
    }

    if (query.auctionDateEnd) {
      queryBuilder.andWhere('auction.auctionDateEnd <= :auctionDateEnd', {
        auctionDateEnd: query.auctionDateEnd,
      });
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

    if (user.type !== UserType.ADMIN) {
      queryBuilder.andWhere(
        '(sellerInvestor.id = :userId OR auction.status IN (:...publicStatuses))',
        {
          userId: user.id,
          publicStatuses: [AuctionStatus.PUBLISHED, AuctionStatus.LIVE],
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

    if (user.type === UserType.ADMIN) {
      if (updateAuctionDto.status !== undefined) {
        if (updateAuctionDto.status === AuctionStatus.LIVE) {
          throw new BadRequestException(
            `Auction status cannot be set to live manually`,
          );
        }

        if (
          updateAuctionDto.status === AuctionStatus.PAUSED &&
          auction.status !== AuctionStatus.LIVE
        ) {
          throw new BadRequestException(
            `Auction can only be paused when it is live`,
          );
        }

        if (
          updateAuctionDto.status === AuctionStatus.PAUSED &&
          auction.status === AuctionStatus.LIVE
        ) {
          auction.pausedAt = new Date();
        }

        if (
          updateAuctionDto.status === AuctionStatus.PUBLISHED &&
          auction.status === AuctionStatus.PAUSED
        ) {
          const pauseDurationMs = Date.now() - auction.pausedAt!.getTime();
          auction.auctionDate.auctionDateEnd = new Date(
            auction.auctionDate.auctionDateEnd.getTime() + pauseDurationMs,
          );
          auction.pausedAt = null;
        }
      }
    } else {
      if (
        auction.status === AuctionStatus.LIVE ||
        auction.status === AuctionStatus.PAUSED
      ) {
        throw new ForbiddenException(
          `You do not have permission to perform this action`,
        );
      }

      if (auction.invoice.sellerInvestor.id !== user.id) {
        throw new ForbiddenException(
          `You do not have permission to perform this action`,
        );
      }

      if (
        auction.status === AuctionStatus.PUBLISHED &&
        toUTCDate(auction.auctionDate.auctionDateStart) <= new Date()
      ) {
        throw new BadRequestException(
          `Auction with id ${id} has already started and cannot be updated`,
        );
      }

      if (
        updateAuctionDto.status !== AuctionStatus.DRAFT &&
        auction.status !== AuctionStatus.PUBLISHED
      ) {
        updateAuctionDto.status = auction.status;
      }

      updateAuctionDto.lastCommunication = auction.lastCommunication;
    }

    Object.assign(auction, updateAuctionDto.removeUndefined());
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
}
