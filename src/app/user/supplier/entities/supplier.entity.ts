import { BankAccount } from 'src/app/bank-account/entities/bank-account.entity';
import { Document } from 'src/app/document/entities/document.entity';
import { Invoice } from 'src/app/invoice/entities/invoice.entity';
import { User } from 'src/app/user/common/entities/user.entity';
import { ChildEntity, Column, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { SupplierStatus } from '../enums/supplier-status.enum';

@ChildEntity('supplier')
export class Supplier extends User {
  @Column('numeric', { unique: true })
  phoneNumber: number;

  @Column('text', { unique: true })
  companyName: string;

  @Column('text', { nullable: true })
  logo: string;

  @Column('text')
  website: string;

  @Column('enum', {
    enum: SupplierStatus,
    default: SupplierStatus.PENDING,
  })
  status: SupplierStatus;

  @Column('bool', { default: false })
  isOptedInNotificationsEmail: boolean;

  @Column('bool', { default: false })
  isOptedInNotificationsSMS: boolean;

  @OneToMany(() => Invoice, (invoice) => invoice.supplier, { cascade: true })
  invoices: Invoice[];

  @OneToOne(() => Document, { cascade: true, eager: true })
  @JoinColumn()
  document: Document;

  @OneToOne(() => BankAccount, { cascade: true, eager: true })
  @JoinColumn()
  bankAccount: BankAccount;
}
