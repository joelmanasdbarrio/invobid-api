import { Auction } from 'src/app/auction/entities/auction.entity';
import { Debtor } from 'src/app/debtor/entities/debtor.entity';
import { Document } from 'src/app/document/entities/document.entity';
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
    scale: 3,
    nullable: false,
  })
  amount: number;

  @Column('date', { nullable: false })
  dueDate: Date;

  @Column(() => TransactionFee)
  transactionFee: TransactionFee;

  @Column('decimal', {
    precision: 5,
    scale: 2,
    nullable: true,
  })
  rating: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
