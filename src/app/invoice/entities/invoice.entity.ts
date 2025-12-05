import { Auction } from 'src/app/auction/entities/auction.entity';
import { Document } from 'src/app/document/entities/document.entity';
import { Investor } from 'src/app/user/investor/entities/investor.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export class Debtor {
  @Column('text', { nullable: false })
  id: string;

  @Column('text', { nullable: false })
  companyName: string;

  @Column('text')
  website: string;

  @Column('text')
  email: string;
}

export class TransactionFee {
  @Column('decimal', { precision: 5, scale: 2 })
  sellerPercentage: number;

  @Column('decimal', { precision: 5, scale: 2 })
  buyerPercentage: number;
}

@Entity('invoices')
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Investor, (investor) => investor.listedInvoices, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  sellerInvestor: Investor;

  @ManyToOne(() => Investor, (investor) => investor.purchasedInvoices, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  buyerInvestor: Investor;

  @OneToOne(() => Document, { cascade: true, eager: true })
  @JoinColumn()
  document: Document;

  @OneToMany(() => Auction, (auction) => auction.invoice, {
    cascade: true,
    eager: true,
  })
  auctions: Auction[];

  @Column(() => Debtor)
  debtor: Debtor;

  @Column('decimal', { precision: 15, scale: 2, nullable: false })
  amount: number;

  @Column('date', { nullable: false })
  dueDate: Date;

  @Column(() => TransactionFee)
  transactionFee: TransactionFee;

  @Column('decimal', { precision: 5, scale: 2 })
  rating: number;

  @CreateDateColumn({ select: false })
  createdAt: Date;

  @UpdateDateColumn({ select: false })
  updatedAt: Date;

  @DeleteDateColumn({ select: false })
  deletedAt: Date;
}
