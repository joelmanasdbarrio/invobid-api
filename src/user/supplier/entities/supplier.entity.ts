import { BankAccount } from 'src/bank-account/entities/bank-account.entity';
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
import { SupplierStatus } from '../enums/supplier-status.enum';

@Entity('suppliers')
@ChildEntity('supplier')
export class Supplier extends User {
  @Column('numeric', {
    unique: true,
  })
  phoneNumber: number;

  @Column({
    unique: true,
  })
  companyName: string;

  @Column({
    nullable: true,
  })
  logo: string;

  @Column()
  website: string;

  @Column({
    type: 'enum',
    enum: SupplierStatus,
    default: SupplierStatus.PENDING,
  })
  status: SupplierStatus;

  @Column({
    default: false,
  })
  isOptedInNotificationsEmail: boolean;

  @Column({
    default: false,
  })
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
