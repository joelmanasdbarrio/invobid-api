import { Length } from 'class-validator';
import { BankAccount } from 'src/app/bank-account/entities/bank-account.entity';
import { Bid } from 'src/app/bid/entities/bid.entity';
import { Debtor } from 'src/app/debtor/entities/debtor.entity';
import { Document } from 'src/app/document/entities/document.entity';
import { Invoice } from 'src/app/invoice/entities/invoice.entity';
import { User } from 'src/app/user/common/entities/user.entity';
import { ChildEntity, Column, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { InvestorStatus } from '../enums/investor-status.enum';
import { InvestorType } from '../enums/investor-type.enum';

@ChildEntity('investor')
export class Investor extends User {
  @Column('text', { unique: true })
  phoneNumber: string;

  @Column('text', { unique: true })
  companyName: string;

  @Length(9, 9)
  @Column('text', { unique: true })
  taxId: string;

  @Column('enum', {
    enum: InvestorType,
    nullable: false,
  })
  investorType: InvestorType;

  @Column('enum', {
    enum: InvestorStatus,
    default: InvestorStatus.PENDING,
  })
  status: InvestorStatus;

  @Column('text', { nullable: true })
  lastCommunication?: string;

  @Column('bool', { default: false })
  isOptedInNotificationsEmail: boolean;

  @Column('bool', { default: false })
  isOptedInNotificationsSMS: boolean;

  @OneToMany(() => Document, (document) => document.investor, {
    cascade: true,
  })
  documents: Document[];

  @OneToMany(() => Invoice, (invoice) => invoice.sellerInvestor, {
    cascade: true,
  })
  listedInvoices: Invoice[];

  @OneToMany(() => Invoice, (invoice) => invoice.buyerInvestor, {
    cascade: true,
  })
  purchasedInvoices: Invoice[];

  @OneToMany(() => Bid, (bid) => bid.investor)
  bids: Bid[];

  @OneToMany(() => Debtor, (debtor) => debtor.investor, {
    cascade: true,
  })
  debtors: Debtor[];

  @OneToOne(() => BankAccount, { cascade: true })
  @JoinColumn()
  bankAccount: BankAccount;
}
