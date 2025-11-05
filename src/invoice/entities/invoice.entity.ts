import { Auction } from 'src/auction/entities/auction.entity';
import { Document } from 'src/document/entities/document.entity';
import { Investor } from 'src/user/investor/entities/investor.entity';
import { Supplier } from 'src/user/supplier/entities/supplier.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export class Debtor {
  @Column({ nullable: false })
  id: string;

  @Column({ nullable: false })
  companyName: string;

  @Column()
  website: string;

  @Column()
  email: string;
}

export class TransactionFee {
  @Column('decimal', { precision: 5, scale: 2 })
  supplierPercentage: number;

  @Column('decimal', { precision: 5, scale: 2 })
  investorPercentage: number;
}

@Entity('invoices')
export class Invoice {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Supplier, (supplier) => supplier.invoices, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  supplier: Supplier;

  @ManyToOne(() => Investor, (investor) => investor.invoices, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  investor: Investor;

  @OneToMany(() => Auction, (auction) => auction.invoice, {
    cascade: true,
    eager: true,
  })
  auctions: Auction[];

  @OneToOne(() => Document, { cascade: true, eager: true })
  @JoinColumn()
  document: Document;

  @Column(() => Debtor)
  debtor: Debtor;

  @Column('decimal', { precision: 15, scale: 2, nullable: false })
  amount: number;

  @Column({
    type: 'date',
    nullable: false,
  })
  dueDate: Date;

  @Column(() => TransactionFee)
  transactionFee: TransactionFee;

  @Column('decimal', { precision: 5, scale: 2 })
  rating: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
