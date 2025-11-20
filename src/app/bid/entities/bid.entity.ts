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

  @Column('decimal', { precision: 10, scale: 2, nullable: false })
  amount: number;

  @CreateDateColumn()
  createdAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
