import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Auction } from './entities/auction.entity';
import { AuctionStatus } from './enums/auction-status.enum';

@Injectable()
export class AuctionSchedulerService {
  private readonly logger = new Logger(AuctionSchedulerService.name);

  constructor(
    @InjectRepository(Auction)
    private readonly auctionRepository: Repository<Auction>,
  ) {}

  /**
   * Transitions PUBLISHED auctions to TRANSITIONING when auctionDateEnd has been reached.
   * Runs every minute.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async publishedToTransitioning(): Promise<void> {
    const result = await this.auctionRepository
      .createQueryBuilder()
      .update(Auction)
      .set({ status: AuctionStatus.TRANSITIONING })
      .where('status = :status', { status: AuctionStatus.PUBLISHED })
      .andWhere('"auctionDateAuctiondateend" <= NOW()')
      .execute();

    if (result.affected && result.affected > 0) {
      this.logger.log(
        `Transitioned ${result.affected} auction(s) PUBLISHED → TRANSITIONING`,
      );
    }
  }
}
