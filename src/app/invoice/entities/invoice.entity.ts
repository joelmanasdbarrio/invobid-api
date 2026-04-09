import { Auction } from 'src/app/auction/entities/auction.entity';
import { Debtor } from 'src/app/debtor/entities/debtor.entity';
import { Document } from 'src/app/document/entities/document.entity';
import { Currency } from 'src/app/invoice/enums/currency.enum';
import { InvoiceStatus } from 'src/app/invoice/enums/invoice-status.enum';
import { Investor } from 'src/app/user/investor/entities/investor.entity';
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

class TransactionFee {
  @Column('decimal', { precision: 4, scale: 2 })
  sellerPercentage: number;

  @Column('decimal', { precision: 4, scale: 2 })
  buyerPercentage: number;
}

@Entity('invoices')
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text', { unique: true })
  svc: string;

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

  @Column('enum', {
    enum: InvoiceStatus,
    default: InvoiceStatus.PENDING,
  })
  status: InvoiceStatus;

  @Column('text', { nullable: true })
  lastCommunication: string;

  @OneToMany(() => Document, (document) => document.invoice, {
    cascade: true,
    eager: true,
  })
  documents: Document[];

  @OneToMany(() => Auction, (auction) => auction.invoice, {
    cascade: true,
    eager: true,
  })
  auctions: Auction[];

  @ManyToOne(() => Debtor, (debtor) => debtor.id, {
    nullable: false,
    eager: true,
  })
  debtor: Debtor;

  @Column('decimal', {
    precision: 15,
    scale: 2,
    nullable: false,
  })
  amount: number;

  @Column('enum', { enum: Currency, default: Currency.EUR })
  currency: Currency;

  @Column('date', { nullable: false })
  dueDate: Date;

  @Column(() => TransactionFee)
  transactionFee: TransactionFee;

  @Column('decimal', {
    precision: 4,
    scale: 2,
    nullable: true,
  })
  rating: number;

  @Column('decimal', {
    precision: 4,
    scale: 2,
    nullable: true,
  })
  extRating?: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz' })
  deletedAt: Date;
}
