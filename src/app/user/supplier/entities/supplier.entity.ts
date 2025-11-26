import { BankAccount } from 'src/app/bank-account/entities/bank-account.entity';
import { Document } from 'src/app/document/entities/document.entity';
import { Invoice } from 'src/app/invoice/entities/invoice.entity';
import { User } from 'src/app/user/common/entities/user.entity';
import { ChildEntity, Column, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { SupplierStatus } from '../enums/supplier-status.enum';

@ChildEntity('supplier')
export class Supplier extends User {
  @Column('text', { unique: true })
  phoneNumber: string;

  @Column('text', { unique: true })
  companyName: string;

  @Column('text', { nullable: true })
  logo: string;

  @Column('text')
  website: string;

  @Column('enum', {
    enum: SupplierStatus,
    default: SupplierStatus.PENDING,
    select: false,
  })
  status: SupplierStatus;

  @Column('bool', { default: false, select: false })
  isOptedInNotificationsEmail: boolean;

  @Column('bool', { default: false, select: false })
  isOptedInNotificationsSMS: boolean;

  @OneToMany(() => Invoice, (invoice) => invoice.supplier, { cascade: true })
  invoices: Invoice[];

  @OneToOne(() => Document, { cascade: true })
  @JoinColumn()
  document: Document;

  @OneToOne(() => BankAccount, { cascade: true })
  @JoinColumn()
  bankAccount: BankAccount;
}
