import { Bid } from 'src/app/bid/entities/bid.entity';
import { Invoice } from 'src/app/invoice/entities/invoice.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AuctionStatus } from '../enums/auction-status.enum';

class AuctionDate {
  @Column('timestamptz', { nullable: true })
  start: Date;

  @Column('timestamptz', { nullable: true })
  end: Date;
}

class AuctionPrice {
  @Column('decimal', { precision: 15, scale: 2, nullable: false })
  start: number;

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  end: number;
}

class AuctionDiscount {
  @Column('decimal', { precision: 4, scale: 2, nullable: false })
  start: number;

  @Column('decimal', { precision: 4, scale: 2, nullable: true })
  end: number;
}

class AuctionProfitability {
  @Column('decimal', { precision: 6, scale: 2, nullable: false })
  start: number;

  @Column('decimal', { precision: 6, scale: 2, nullable: true })
  end: number;
}

@Entity('auctions')
export class Auction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Invoice, (invoice) => invoice.auctions, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  invoice: Invoice;

  @Column(() => AuctionPrice)
  price: AuctionPrice;

  @Column(() => AuctionDiscount)
  discount: AuctionDiscount;

  @Column(() => AuctionProfitability)
  profitability: AuctionProfitability;

  @Column(() => AuctionDate)
  date: AuctionDate;

  @Column('enum', {
    enum: AuctionStatus,
    default: AuctionStatus.DRAFT,
  })
  status: AuctionStatus;

  @Column('text', {
    nullable: true,
  })
  lastCommunication: string;

  @OneToMany(() => Bid, (bid) => bid.auction, {
    cascade: true,
  })
  bids: Bid[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ nullable: true, type: 'timestamptz' })
  deletedAt: Date;
}
