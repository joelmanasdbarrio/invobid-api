import { Debtor } from 'src/app/debtor/entities/debtor.entity';
import { Invoice } from 'src/app/invoice/entities/invoice.entity';
import { Investor } from 'src/app/user/investor/entities/investor.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DocumentType } from '../enums/document-type.enum';

@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text', { nullable: false })
  title: string;

  @Column('text', { nullable: false })
  filename: string;

  @Column('text', { nullable: false })
  value: string;

  @Column('text', { nullable: false })
  type: DocumentType;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({ select: false })
  deletedAt: Date;

  @ManyToOne(() => Investor, (investor) => investor.documents, {
    nullable: false,
  })
  investor: Investor;

  @ManyToOne(() => Debtor, (debtor) => debtor.documents, {
    nullable: true,
  })
  debtor: Debtor;

  @ManyToOne(() => Invoice, (invoice) => invoice.documents, {
    nullable: true,
  })
  invoice: Invoice;
}
