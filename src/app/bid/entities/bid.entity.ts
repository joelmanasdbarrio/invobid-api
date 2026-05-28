import { Auction } from 'src/app/auction/entities/auction.entity';
import { Investor } from 'src/app/user/investor/entities/investor.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('bids')
export class Bid {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Auction, (auction) => auction.bids, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  auction: Auction;

  @ManyToOne(() => Investor, (investor) => investor.bids, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  investor: Investor;

  @Column('decimal', { precision: 15, scale: 2, nullable: false })
  amount: number;

  @Column('decimal', { precision: 8, scale: 4, nullable: false })
  discount: number;

  @Column('decimal', { precision: 8, scale: 4, nullable: false })
  profitability: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @DeleteDateColumn({ select: false, type: 'timestamptz' })
  deletedAt: Date;
}
