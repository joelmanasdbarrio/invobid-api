import { BankAccount } from 'src/bank-account/entities/bank-account.entity';
import { Bid } from 'src/bid/entities/bid.entity';
import { Document } from 'src/document/entities/document.entity';
import { Invoice } from 'src/invoice/entities/invoice.entity';
import { User } from 'src/user/common/entities/user.entity';
import {
  ChildEntity,
  Column,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { InvestorStatus } from '../enums/investor-status.enum';
import { InvestorType } from '../enums/investor-type.enum';

@Entity('investors')
@ChildEntity('investor')
export class Investor extends User {
  @Column('numeric', {
    unique: true,
  })
  phoneNumber: number;

  @Column({
    unique: true,
  })
  companyName: string;

  @Column({
    type: 'enum',
    enum: InvestorType,
    nullable: false,
  })
  investorType: InvestorType;

  @OneToOne(() => Document, { cascade: true, eager: true })
  @JoinColumn()
  document: Document;

  @Column({
    type: 'enum',
    enum: InvestorStatus,
    default: InvestorStatus.PENDING,
  })
  status: InvestorStatus;

  @Column({
    default: false,
  })
  isOptedInNotificationsEmail: boolean;

  @Column({
    default: false,
  })
  isOptedInNotificationsSMS: boolean;

  @OneToMany(() => Invoice, (invoice) => invoice.investor, { cascade: true })
  invoices: Invoice[];

  @OneToMany(() => Bid, (bid) => bid.investor)
  bids: Bid[];

  @OneToOne(() => BankAccount, { cascade: true, eager: true })
  @JoinColumn()
  bankAccount: BankAccount;
}
