import { Length } from 'class-validator';
import { Document } from 'src/app/document/entities/document.entity';
import { Invoice } from 'src/app/invoice/entities/invoice.entity';
import { Investor } from 'src/app/user/investor/entities/investor.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('debtors')
@Index(['investor', 'email'], { unique: true })
@Index(['investor', 'phoneNumber'], { unique: true })
@Index(['investor', 'companyName'], { unique: true })
@Index(['investor', 'taxId'], { unique: true })
export class Debtor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Investor, (investor) => investor.debtors, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  investor: Investor;

  @Column('text')
  email: string;

  @Column('text')
  phoneNumber: string;

  @Column('text')
  companyName: string;

  @Length(9, 9)
  @Column('text')
  taxId: string;

  @OneToMany(() => Document, (document) => document.debtor, {
    cascade: true,
  })
  documents: Document[];

  @OneToMany(() => Invoice, (invoice) => invoice.debtor, {
    cascade: true,
  })
  invoices: Invoice[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt: Date | null;
}
