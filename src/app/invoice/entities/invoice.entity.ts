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
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

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

  @Column('enum', {
    enum: InvoiceStatus,
    default: InvoiceStatus.VERIFIED,
  })
  status: InvoiceStatus;

  @Column('text', { nullable: true })
  lastCommunication: string;

  @OneToOne(() => Document, { cascade: true, eager: true })
  @JoinColumn()
  document: Document;

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
