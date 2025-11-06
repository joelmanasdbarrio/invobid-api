import { Bid } from 'src/bid/entities/bid.entity';
import { Invoice } from 'src/invoice/entities/invoice.entity';
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
import { AuctionStatus } from '../enum/auction-status.enum';

@Entity('auctions')
export class Auction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Invoice, (invoice) => invoice.auctions, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  invoice: Invoice;

  @Column('decimal', { precision: 5, scale: 2, nullable: false })
  discountRate: number;

  @Column('date', {
    nullable: true,
  })
  auctionDate: Date;

  @Column('date', {
    nullable: true,
  })
  dueDate: Date;

  @Column({
    type: 'enum',
    enum: AuctionStatus,
    default: AuctionStatus.PENDING,
  })
  status: AuctionStatus;

  @OneToMany(() => Bid, (bid) => bid.auction, {
    cascade: true,
    eager: true,
  })
  bids: Bid[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
