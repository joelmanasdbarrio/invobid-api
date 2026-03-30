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
  auctionDateStart: Date;

  @Column('timestamptz', { nullable: true })
  auctionDateEnd: Date;
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

  @Column('decimal', {
    precision: 15,
    scale: 2,
    nullable: false,
  })
  startingPrice: number;

  @Column('decimal', {
    precision: 15,
    scale: 2,
    nullable: true,
  })
  endingPrice: number;

  @Column('decimal', {
    precision: 8,
    scale: 4,
    nullable: false,
  })
  discount: number;

  @Column('decimal', {
    precision: 8,
    scale: 4,
    nullable: false,
  })
  profitability: number;

  @Column(() => AuctionDate)
  auctionDate: AuctionDate;

  @Column('enum', {
    enum: AuctionStatus,
    default: AuctionStatus.DRAFT,
  })
  status: AuctionStatus;

  @OneToMany(() => Bid, (bid) => bid.auction, {
    cascade: true,
    eager: true,
  })
  bids: Bid[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ nullable: true, type: 'timestamptz' })
  deletedAt: Date;
}
