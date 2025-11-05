import { Auction } from 'src/auction/entities/auction.entity';
import { Investor } from 'src/user/investor/entities/investor.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('bids')
export class Bid {
  @PrimaryGeneratedColumn()
  id: number;

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

  @Column('decimal', { precision: 10, scale: 2, nullable: false })
  amount: number;

  @CreateDateColumn()
  createdAt: Date;
}
